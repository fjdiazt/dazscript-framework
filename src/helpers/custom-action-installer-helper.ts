import { debug } from '@dsf/common/log'
import { CustomAction } from '@dsf/core/custom-action'
import { BasicDialog } from '@dsf/dialog/basic-dialog'
import { PopupMenuBuilder, PopupMenuItem } from '@dsf/dialog/builders/popup-menu-builder'
import { addToToolbar, applyCustomActionTargets, cleanupEmptyToolbar, clearToolbar, getInstalledCustomActionState, removeCustomActionTargets } from '@dsf/helpers/custom-action-helper'
import { checkAll, getDataItem } from '@dsf/helpers/list-view-helper'
import { findAction, findActionsForShortcut, getActionShortcut, isCustomAction, normalizeShortcut, setActionShortcut } from '@dsf/helpers/action-helper'
import { progress } from '@dsf/helpers/progress-helper'
import { Observable } from '@dsf/lib/observable'
import CustomSet from '@dsf/lib/set'
import { TreeNode } from '@dsf/lib/tree-node'
import { promptKeyboardShortcut } from '@dsf/shared/set-keyboard-shortcut'
import { readFromFile, saveToFile } from './file-helper'

type InstallerEntry = {
    action: CustomAction
    supportsMenu: boolean
    supportsToolbar: boolean
    selected: boolean
    installedMenu: boolean
    installedToolbar: boolean
    installedShortcut: string
    defaultShortcut: string
    effectiveShortcut: string
    isShortcutOverridden: boolean
    installedActionName: string
}

type SetupDialogOptions = {
    settingsPath: string
    bundleName?: string
    shortcuts?: ActionAccelerator[]
    shortcutsSourcePath?: string
    shortcutBackupPath?: string
}

type ActionAccelerator = {
    name?: string
    action?: string
    text?: string
    label?: string
    shortcut?: string
    accelerator?: string
    key?: string
}

type ShortcutEntry = {
    selected: boolean
    name: string
    label: string
    currentShortcut: string
    newShortcut: string
    conflictText: string
    exists: boolean
    isCustom: boolean
}

type ShortcutBackupEntry = {
    name: string
    shortcut: string
}

type ShortcutBackupFile = {
    version: number
    shortcuts: ShortcutBackupEntry[]
}

type SetupSelection = {
    actions: InstallerEntry[]
    shortcuts: ShortcutEntry[]
}

const OVERRIDE_MARKER = '[ovr]'

const toKey = (action: CustomAction): string => String(action.filePath ?? action.text ?? '')

const toTreeNode = (entry: InstallerEntry): TreeNode<InstallerEntry> =>
    new TreeNode(String(entry.action.text), toKey(entry.action), entry)

const toShortcutTreeNode = (entry: ShortcutEntry): TreeNode<ShortcutEntry> =>
    new TreeNode(entry.label, entry.name, entry)

const getEntry = (item: TreeNode<InstallerEntry>): InstallerEntry =>
    item.value as InstallerEntry

const getShortcutEntry = (item: TreeNode<ShortcutEntry>): ShortcutEntry =>
    item.value as ShortcutEntry

const getDisplayedToolbar = (entry: InstallerEntry): string => String(entry.action.toolbar ?? '')

const getSetupDialogOptions = (options: string | SetupDialogOptions): SetupDialogOptions =>
    typeof options === 'string'
        ? { settingsPath: options }
        : options

const getShortcutBackupPath = (options: SetupDialogOptions): string =>
    `${App.getAppDataPath()}/${options.shortcutBackupPath ?? `${options.settingsPath}/keyboard-shortcuts-backup.json`}`

const getDisplayedShortcut = (entry: InstallerEntry): string => {
    if (!entry.isShortcutOverridden) return entry.effectiveShortcut
    return entry.effectiveShortcut
        ? `${entry.effectiveShortcut} ${OVERRIDE_MARKER}`
        : OVERRIDE_MARKER
}

const updateOverrideState = (entry: InstallerEntry) => {
    entry.isShortcutOverridden = Boolean(entry.installedActionName) &&
        normalizeShortcut(entry.installedShortcut) !== normalizeShortcut(entry.defaultShortcut)
}

const buildEntries = (actions: CustomAction[]): InstallerEntry[] => {
    return actions
        .filter((action) => Boolean(action.menuPath) || Boolean(action.toolbar))
        .map((action) => {
            const installed = getInstalledCustomActionState(action)
            const supportsMenu = Boolean(action.menuPath)
            const supportsToolbar = Boolean(action.toolbar)
            const hasInstalledTargets = installed.installedMenu || installed.installedToolbar
            const defaultShortcut = normalizeShortcut(String(action.shortcut ?? ''))
            const installedShortcut = normalizeShortcut(String(installed.customAction?.shortcut ?? ''))
            const entry: InstallerEntry = {
                action: { ...action },
                supportsMenu,
                supportsToolbar,
                selected: hasInstalledTargets,
                installedMenu: installed.installedMenu,
                installedToolbar: installed.installedToolbar,
                installedShortcut,
                defaultShortcut,
                effectiveShortcut: installed.customAction?.name ? installedShortcut : defaultShortcut,
                isShortcutOverridden: false,
                installedActionName: String(installed.customAction?.name ?? '')
            }

            updateOverrideState(entry)
            return entry
        })
}

const normalizeAccelerator = (accelerator: ActionAccelerator): { name: string, label: string, shortcut: string } | null => {
    const name = String(accelerator.name ?? accelerator.action ?? '').trim()
    const shortcut = normalizeShortcut(String(accelerator.shortcut ?? accelerator.accelerator ?? accelerator.key ?? '').trim())
    if (!name || !shortcut) return null

    return {
        name,
        label: String(accelerator.text ?? accelerator.label ?? name),
        shortcut
    }
}

const getShortcutConflictText = (name: string, shortcut: string): string => {
    if (!shortcut) return ''

    const conflicts = findActionsForShortcut(shortcut)
        .filter(action => action && action.name !== name)

    return conflicts.map(action => String(action.text || action.name)).join(', ')
}

const buildShortcutEntries = (accelerators: ActionAccelerator[] = []): ShortcutEntry[] => {
    return accelerators
        .map(normalizeAccelerator)
        .filter((accelerator): accelerator is { name: string, label: string, shortcut: string } => accelerator !== null)
        .map((accelerator) => {
            const action = findAction(accelerator.name)
            const currentShortcut = getActionShortcut(accelerator.name)
            const newShortcut = normalizeShortcut(accelerator.shortcut)

            return {
                selected: true,
                name: accelerator.name,
                label: action?.text ? String(action.text) : accelerator.label,
                currentShortcut,
                newShortcut,
                conflictText: getShortcutConflictText(accelerator.name, newShortcut),
                exists: action !== null,
                isCustom: action ? isCustomAction(action) : false
            }
        })
}

class InstallerSelectionDialog extends BasicDialog {
    private readonly keywords$ = new Observable('')
    private readonly items$: Observable<TreeNode<InstallerEntry>[]>
    private readonly shortcutKeywords$ = new Observable('')
    private readonly shortcutItems$: Observable<TreeNode<ShortcutEntry>[]>
    private readonly refreshListEvent$ = new Observable<void>()
    private listView: DzListView | null = null
    private shortcutListView: DzListView | null = null

    constructor(
        private readonly entries: InstallerEntry[],
        private readonly shortcutEntries: ShortcutEntry[],
        bundleName?: string
    ) {
        super(bundleName ? `${bundleName} Setup` : 'Setup Scripts', 'dsfSetupScripts')
        this.items$ = new Observable(entries.map(toTreeNode))
        this.shortcutItems$ = new Observable(shortcutEntries.map(toShortcutTreeNode))
    }

    protected build(): void {
        this.builder.options({ resizable: true, width: 1100, height: 700 })
        this.dialog.setAcceptButtonText('Apply')
        this.dialog.setCancelButtonText('Cancel')

        if (this.shortcutEntries.length > 0) {
            const add = this.add
            add.tab('Scripts').build(() => this.buildScriptsTab())
            add.tab('Keyboard Shortcuts').build(() => this.buildShortcutsTab())
            return
        }

        this.buildScriptsTab()
    }

    getSelections(): SetupSelection {
        this.syncSelectionsFromListView()
        this.syncShortcutSelectionsFromListView()
        return {
            actions: this.entries,
            shortcuts: this.shortcutEntries
        }
    }

    private buildScriptsTab(): void {
        const add = this.add

        add.label('Choose which scripts to install, then use the columns to review their shortcut, menu, and toolbar targets.')
            .wordWrap()
            .build()
        add.group('Search').horizontal().build(() => {
            add.edit()
                .value(this.keywords$)
                .focus()
                .placeholder('Search actions...')
                .toolTip('Search by action name, description, path, shortcut, or available targets.')
            add.button('Select All').clicked(() => this.setVisibleSelections(true))
            add.button('Deselect All').clicked(() => this.setVisibleSelections(false))
        })

        add.group('Scripts')
            .style({ flat: true })
            .build(() => {
                add.list.view<InstallerEntry, InstallerEntry>()
                    .sorting(true)
                    .sortOnBuild(true)
                    .refresh(this.refreshListEvent$)
                    .row((item, parent, id) => {
                        const entry = getEntry(item)
                        const listItem = new DzCheckListItem(parent, DzCheckListItem.CheckBox, id)
                        listItem.on = entry.selected
                        listItem.setText(0, '')
                        return listItem
                    })
                    .contextMenu((listView, item) => this.buildContextMenu(listView, item))
                    .items(this.items$)
                    .columns(['Install', 'Action', 'Shortcut', 'Description', 'Menu', 'Toolbar'], (index, width) => {
                        if (index === 0) return Math.max(width, 70)
                        if (index === 1) return Math.max(width * 1.6, 220)
                        if (index === 2) return Math.max(width, 140)
                        if (index === 3) return Math.max(width * 1.8, 240)
                        if (index === 4) return Math.max(width * 2.5, 320)
                        if (index === 5) return Math.max(width * 1.2, 140)
                        return width
                    })
                    .text((item) => {
                        const entry = getEntry(item)
                        return [
                            '',
                            String(entry.action.text ?? ''),
                            getDisplayedShortcut(entry),
                            String(entry.action.description ?? ''),
                            String(entry.action.menuPath ?? ''),
                            getDisplayedToolbar(entry),
                        ]
                    })
                    .data((item) => getEntry(item))
                    .filter({
                        keywords: this.keywords$,
                        field: (listItem) => [
                            listItem.text(1),
                            listItem.text(2),
                            listItem.text(3),
                            listItem.text(4),
                            listItem.text(5),
                        ].join(' ')
                    })
                    .build((listView) => {
                        this.listView = listView
                        listView.allColumnsShowFocus = true
                    })
            })
    }

    private buildShortcutsTab(): void {
        const add = this.add

        add.label('Choose which keyboard shortcuts to apply. Current and new shortcut values are shown side by side.')
            .wordWrap()
            .build()
        add.group('Search').horizontal().build(() => {
            add.edit()
                .value(this.shortcutKeywords$)
                .placeholder('Search shortcuts...')
                .toolTip('Search by action name, current shortcut, new shortcut, status, or conflicts.')
            add.button('Select All').clicked(() => this.setVisibleShortcutSelections(true))
            add.button('Deselect All').clicked(() => this.setVisibleShortcutSelections(false))
        })

        add.group('Keyboard Shortcuts')
            .style({ flat: true })
            .build(() => {
                add.list.view<ShortcutEntry, ShortcutEntry>()
                    .sorting(true)
                    .sortOnBuild(true)
                    .row((item, parent, id) => {
                        const entry = getShortcutEntry(item)
                        const listItem = new DzCheckListItem(parent, DzCheckListItem.CheckBox, id)
                        listItem.on = entry.selected
                        listItem.setText(0, '')
                        return listItem
                    })
                    .items(this.shortcutItems$)
                    .columns(['Apply', 'Action', 'Current', 'New', 'Status', 'Conflicts'], (index, width) => {
                        if (index === 0) return Math.max(width, 70)
                        if (index === 1) return Math.max(width * 2, 260)
                        if (index === 2) return Math.max(width, 130)
                        if (index === 3) return Math.max(width, 130)
                        if (index === 4) return Math.max(width, 120)
                        if (index === 5) return Math.max(width * 2, 260)
                        return width
                    })
                    .text((item) => {
                        const entry = getShortcutEntry(item)
                        return [
                            '',
                            entry.label,
                            entry.currentShortcut || '(none)',
                            entry.newShortcut || '(none)',
                            entry.exists ? (entry.isCustom ? 'Custom Action' : 'DAZ Action') : 'Not currently found',
                            entry.conflictText || ''
                        ]
                    })
                    .data((item) => getShortcutEntry(item))
                    .filter({
                        keywords: this.shortcutKeywords$,
                        field: (listItem) => [
                            listItem.text(1),
                            listItem.text(2),
                            listItem.text(3),
                            listItem.text(4),
                            listItem.text(5),
                        ].join(' ')
                    })
                    .build((listView) => {
                        this.shortcutListView = listView
                        listView.allColumnsShowFocus = true
                    })
            })
    }

    private buildContextMenu(listView: DzListView, listItem: DzListViewItem | null): DzPopupMenu {
        const entry = listItem ? getDataItem<InstallerEntry>(listItem) : null
        const canSetShortcut = Boolean(entry)
        const canResetShortcut = Boolean(entry?.installedActionName && entry?.isShortcutOverridden)

        const items = [
            {
                text: 'Set Shortcut',
                activated: () => {
                    if (!entry) return
                    this.setShortcut(entry)
                }
            },
            {
                text: 'Reset Default Shortcut',
                activated: () => {
                    if (!entry) return
                    this.resetDefaultShortcut(entry)
                }
            },
            {},
            { text: 'Check All', activated: () => this.checkVisible(listView, true) },
            { text: 'Uncheck All', activated: () => this.checkVisible(listView, false) }
        ] as PopupMenuItem[]

        return new PopupMenuBuilder(this.builder.context).items(...items).build((menu) => {
            menu.setItemEnabled(0, canSetShortcut)
            menu.setItemEnabled(1, canResetShortcut)
        })
    }

    private setShortcut(entry: InstallerEntry) {
        const actionName = entry.installedActionName || toKey(entry.action)
        const actionLabel = String(entry.action.text ?? entry.action.filePath ?? actionName)
        const shortcut = promptKeyboardShortcut(actionLabel, actionName, entry.effectiveShortcut)
        if (shortcut == null) return

        if (entry.installedActionName) {
            setActionShortcut(entry.installedActionName, shortcut)
            entry.installedShortcut = normalizeShortcut(shortcut)
            entry.effectiveShortcut = entry.installedShortcut
            updateOverrideState(entry)
        } else {
            entry.effectiveShortcut = normalizeShortcut(shortcut)
        }

        this.refreshListEvent$.trigger()
    }

    private resetDefaultShortcut(entry: InstallerEntry) {
        if (!entry.installedActionName || !entry.isShortcutOverridden) return

        setActionShortcut(entry.installedActionName, entry.defaultShortcut)
        entry.installedShortcut = normalizeShortcut(entry.defaultShortcut)
        entry.effectiveShortcut = entry.installedShortcut
        updateOverrideState(entry)
        this.refreshListEvent$.trigger()
    }

    private checkVisible(listView: DzListView, onOff: boolean) {
        if (!this.keywords$.value?.trim()) {
            checkAll(listView, onOff)
        }

        listView.getItems(DzListView.All).forEach((item) => {
            if (!item.visible || !(item as any).inherits('DzCheckListItem')) return

            const checkbox = item as DzCheckListItem
            checkbox.on = onOff

            const data = getDataItem<InstallerEntry>(item)
            if (!data) return
            data.selected = onOff
        })
    }

    private setVisibleSelections(onOff: boolean) {
        if (!this.listView) return
        this.checkVisible(this.listView, onOff)
    }

    private syncSelectionsFromListView() {
        if (!this.listView) return

        const selectionByKey: Record<string, boolean> = {}

        this.listView.getItems(DzListView.All).forEach((item) => {
            if (!(item as any).inherits('DzCheckListItem')) return

            const data = getDataItem<InstallerEntry>(item)
            if (!data) return

            const checkbox = item as DzCheckListItem
            const selected = !(checkbox.state === 0 && !checkbox.on)
            selectionByKey[toKey(data.action)] = selected
        })

        this.entries.forEach((entry) => {
            const key = toKey(entry.action)
            if (Object.prototype.hasOwnProperty.call(selectionByKey, key)) {
                entry.selected = selectionByKey[key]
            }
        })
    }

    private setVisibleShortcutSelections(onOff: boolean) {
        if (!this.shortcutListView) return
        this.checkShortcutVisible(this.shortcutListView, onOff)
    }

    private checkShortcutVisible(listView: DzListView, onOff: boolean) {
        if (!this.shortcutKeywords$.value?.trim()) {
            checkAll(listView, onOff)
        }

        listView.getItems(DzListView.All).forEach((item) => {
            if (!item.visible || !(item as any).inherits('DzCheckListItem')) return

            const checkbox = item as DzCheckListItem
            checkbox.on = onOff

            const data = getDataItem<ShortcutEntry>(item)
            if (!data) return
            data.selected = onOff
        })
    }

    private syncShortcutSelectionsFromListView() {
        if (!this.shortcutListView) return

        const selectionByName: Record<string, boolean> = {}

        this.shortcutListView.getItems(DzListView.All).forEach((item) => {
            if (!(item as any).inherits('DzCheckListItem')) return

            const data = getDataItem<ShortcutEntry>(item)
            if (!data) return

            const checkbox = item as DzCheckListItem
            const selected = !(checkbox.state === 0 && !checkbox.on)
            selectionByName[data.name] = selected
        })

        this.shortcutEntries.forEach((entry) => {
            if (Object.prototype.hasOwnProperty.call(selectionByName, entry.name)) {
                entry.selected = selectionByName[entry.name]
            }
        })
    }
}

const runDialog = (actions: CustomAction[], options: SetupDialogOptions): SetupSelection | null => {
    const entries = buildEntries(actions)
    const shortcutEntries = buildShortcutEntries(options.shortcuts)
    const dialog = new InstallerSelectionDialog(entries, shortcutEntries, options.bundleName)
    return dialog.ok() ? dialog.getSelections() : null
}

const readShortcutBackup = (backupPath: string): ShortcutBackupFile => {
    const backup = readFromFile<ShortcutBackupFile>(backupPath)
    return backup ?? { version: 1, shortcuts: [] }
}

const saveShortcutBackup = (backupPath: string, backup: ShortcutBackupFile): void => {
    saveToFile(backupPath, JSON.stringify(backup, null, 2))
}

const backupCurrentShortcut = (entry: ShortcutEntry, backupPath: string): void => {
    const action = findAction(entry.name)
    if (!action || isCustomAction(action)) return

    const backup = readShortcutBackup(backupPath)
    const alreadyBackedUp = backup.shortcuts.some(shortcut => shortcut.name === entry.name)
    if (alreadyBackedUp) return

    backup.shortcuts.push({
        name: entry.name,
        shortcut: getActionShortcut(entry.name)
    })
    saveShortcutBackup(backupPath, backup)
}

const applyKeyboardShortcuts = (shortcuts: ShortcutEntry[], options: SetupDialogOptions): void => {
    const selected = shortcuts.filter(shortcut => shortcut.selected)
    if (selected.length === 0) return

    const backupPath = getShortcutBackupPath(options)

    progress('Applying Keyboard Shortcuts', selected, (shortcut) => {
        backupCurrentShortcut(shortcut, backupPath)
        setActionShortcut(shortcut.name, shortcut.newShortcut)
    })
}

export const showSetupCustomActionsDialog = (actions: CustomAction[], options: string | SetupDialogOptions) => {
    const settings = getSetupDialogOptions(options)
    const selections = runDialog(actions, settings)
    if (!selections) return

    debug(`[Setup] applying ${selections.actions.filter(selection => selection.selected).length}/${selections.actions.length} selected actions`)

    const removedToolbarNames = new CustomSet<string>()

    progress('Setting Up Scripts', selections.actions, (selection) => {
        debug(`[Setup] ${selection.selected ? 'install' : 'remove'} "${selection.action.text}"`)

        if (selection.selected) {
            applyCustomActionTargets({
                ...selection.action,
                shortcut: selection.effectiveShortcut
            }, {
                menu: selection.supportsMenu,
                toolbar: selection.supportsToolbar
            })
            return
        }

        if (selection.supportsToolbar && selection.action.toolbar) {
            removedToolbarNames.add(selection.action.toolbar)
        }

        removeCustomActionTargets(selection.action, {
            menu: selection.supportsMenu,
            toolbar: selection.supportsToolbar
        })
    })

    removedToolbarNames.forEach((toolbarName) => {
        clearToolbar(toolbarName)

        const stillSelected = selections.actions.filter(s => s.selected && s.supportsToolbar && s.action.toolbar === toolbarName)
        stillSelected.forEach((s) => addToToolbar({
            ...s.action,
            shortcut: s.effectiveShortcut
        }))
        debug(`[Setup] Toolbar ${toolbarName} rebuilt with ${stillSelected.length} remaining actions`)

        if (stillSelected.length === 0) {
            cleanupEmptyToolbar(toolbarName)
        }
    })

    applyKeyboardShortcuts(selections.shortcuts, settings)
}

export const restoreSetupKeyboardShortcuts = (options: string | SetupDialogOptions) => {
    const settings = getSetupDialogOptions(options)
    const backupPath = getShortcutBackupPath(settings)
    const backup = readFromFile<ShortcutBackupFile>(backupPath)
    if (!backup || !backup.shortcuts || backup.shortcuts.length === 0) return

    progress('Restoring Keyboard Shortcuts', backup.shortcuts, (shortcut) => {
        if (!shortcut.name) return
        setActionShortcut(shortcut.name, shortcut.shortcut ?? '')
    })
}
