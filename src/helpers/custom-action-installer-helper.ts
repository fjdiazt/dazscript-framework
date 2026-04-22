import { debug } from '@dsf/common/log'
import { CustomAction } from '@dsf/core/custom-action'
import { BasicDialog } from '@dsf/dialog/basic-dialog'
import { PopupMenuBuilder, PopupMenuItem } from '@dsf/dialog/builders/popup-menu-builder'
import { addToToolbar, applyCustomActionTargets, cleanupEmptyToolbar, clearToolbar, getInstalledCustomActionState, removeCustomActionTargets } from '@dsf/helpers/custom-action-helper'
import { checkAll, getDataItem } from '@dsf/helpers/list-view-helper'
import { normalizeShortcut, setActionShortcut } from '@dsf/helpers/action-helper'
import { progress } from '@dsf/helpers/progress-helper'
import { Observable } from '@dsf/lib/observable'
import CustomSet from '@dsf/lib/set'
import { TreeNode } from '@dsf/lib/tree-node'
import { promptKeyboardShortcut } from '@dsf/shared/set-keyboard-shortcut'

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
}

const OVERRIDE_MARKER = '[ovr]'

const toKey = (action: CustomAction): string => String(action.filePath ?? action.text ?? '')

const toTreeNode = (entry: InstallerEntry): TreeNode<InstallerEntry> =>
    new TreeNode(String(entry.action.text), toKey(entry.action), entry)

const getDisplayedToolbar = (entry: InstallerEntry): string => String(entry.action.toolbar ?? '')

const getSetupDialogOptions = (options: string | SetupDialogOptions): SetupDialogOptions =>
    typeof options === 'string'
        ? { settingsPath: options }
        : options

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

class InstallerSelectionDialog extends BasicDialog {
    private readonly keywords$ = new Observable('')
    private readonly items$: Observable<TreeNode<InstallerEntry>[]>
    private readonly refreshListEvent$ = new Observable<void>()
    private listView: DzListView | null = null

    constructor(private readonly entries: InstallerEntry[], bundleName?: string) {
        super(bundleName ? `${bundleName} Setup` : 'Setup Scripts', 'dsfSetupScripts')
        this.items$ = new Observable(entries.map(toTreeNode))
    }

    protected build(): void {
        this.builder.options({ resizable: true, width: 1100, height: 700 })
        this.dialog.setAcceptButtonText('Apply')
        this.dialog.setCancelButtonText('Cancel')

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
                        const listItem = new DzCheckListItem(parent, DzCheckListItem.CheckBox, id)
                        listItem.on = item.value.selected
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
                    .text((item) => [
                        '',
                        String(item.value.action.text ?? ''),
                        getDisplayedShortcut(item.value),
                        String(item.value.action.description ?? ''),
                        String(item.value.action.menuPath ?? ''),
                        getDisplayedToolbar(item.value),
                    ])
                    .data((item) => item.value)
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

    getSelections(): InstallerEntry[] {
        this.syncSelectionsFromListView()
        return this.entries
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
}

const runDialog = (actions: CustomAction[], options: SetupDialogOptions): InstallerEntry[] | null => {
    const entries = buildEntries(actions)
    const dialog = new InstallerSelectionDialog(entries, options.bundleName)
    return dialog.ok() ? dialog.getSelections() : null
}

export const showSetupCustomActionsDialog = (actions: CustomAction[], options: string | SetupDialogOptions) => {
    const settings = getSetupDialogOptions(options)
    const selections = runDialog(actions, settings)
    if (!selections) return

    debug(`[Setup] applying ${selections.filter(selection => selection.selected).length}/${selections.length} selected actions`)

    const removedToolbarNames = new CustomSet<string>()

    progress('Setting Up Scripts', selections, (selection) => {
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

        const stillSelected = selections.filter(s => s.selected && s.supportsToolbar && s.action.toolbar === toolbarName)
        stillSelected.forEach((s) => addToToolbar({
            ...s.action,
            shortcut: s.effectiveShortcut
        }))
        debug(`[Setup] Toolbar ${toolbarName} rebuilt with ${stillSelected.length} remaining actions`)

        if (stillSelected.length === 0) {
            cleanupEmptyToolbar(toolbarName)
        }
    })
}
