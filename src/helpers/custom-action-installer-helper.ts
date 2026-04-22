import { debug } from '@dsf/common/log'
import { CustomAction } from '@dsf/core/custom-action'
import { BasicDialog } from '@dsf/dialog/basic-dialog'
import { addToToolbar, applyCustomActionTargets, cleanupEmptyToolbar, clearToolbar, getInstalledCustomActionState, removeCustomActionTargets } from '@dsf/helpers/custom-action-helper'
import CustomSet from '@dsf/lib/set'
import { checkAll, getDataItem } from '@dsf/helpers/list-view-helper'
import { progress } from '@dsf/helpers/progress-helper'
import { Observable } from '@dsf/lib/observable'
import { AppSettings } from '@dsf/lib/settings'
import { TreeNode } from '@dsf/lib/tree-node'

type InstallerPersistedState = {
    selected: boolean
}

type InstallerEntry = {
    action: CustomAction
    supportsMenu: boolean
    supportsToolbar: boolean
    selected: boolean
    installedMenu: boolean
    installedToolbar: boolean
}

class InstallerSettings extends AppSettings {
    constructor(settingsPath: string) {
        super(settingsPath)
    }

    loadSelections(): Record<string, InstallerPersistedState> {
        return this.getJson('actionSelections' as any, {})
    }

    saveSelections(value: Record<string, InstallerPersistedState>) {
        this.setJson('actionSelections' as any, value)
    }
}

const toKey = (action: CustomAction): string => String(action.filePath ?? action.text ?? '')

const toTreeNode = (entry: InstallerEntry): TreeNode<InstallerEntry> =>
    new TreeNode(String(entry.action.text), toKey(entry.action), entry)

const describeTargets = (entry: InstallerEntry): string => {
    const available: string[] = []
    if (entry.supportsMenu) available.push('Menu')
    if (entry.supportsToolbar) available.push('Toolbar')
    return available.join(', ')
}

const buildEntries = (actions: CustomAction[]): InstallerEntry[] => {
    return actions.map((action) => {
        const installed = getInstalledCustomActionState(action)
        const supportsMenu = Boolean(action.menuPath)
        const supportsToolbar = Boolean(action.toolbar)
        const hasInstalledTargets = installed.installedMenu || installed.installedToolbar
        const entry: InstallerEntry = {
            action: { ...action },
            supportsMenu,
            supportsToolbar,
            selected: hasInstalledTargets,
            installedMenu: installed.installedMenu,
            installedToolbar: installed.installedToolbar
        }

        return entry
    })
}

class InstallerSelectionDialog extends BasicDialog {
    private readonly keywords$ = new Observable('')
    private readonly items$: Observable<TreeNode<InstallerEntry>[]>
    private listView: DzListView | null = null

    constructor(private readonly entries: InstallerEntry[]) {
        super('Setup Scripts', 'dsfSetupScripts')
        this.items$ = new Observable(entries.map(toTreeNode))
    }

    protected build(): void {
        this.builder.options({ resizable: true, width: 900, height: 650 })
        this.dialog.setAcceptButtonText('Apply')
        this.dialog.setCancelButtonText('Cancel')

        const add = this.add
        add.group('Search').horizontal().build(() => {
            add.edit()
                .value(this.keywords$)
                .focus()
                .placeholder('Search actions...')
                .toolTip('Search by action name, description, path, group, or available targets.')
            add.button('Select All').clicked(() => this.setVisibleSelections(true))
            add.button('Deselect All').clicked(() => this.setVisibleSelections(false))
        })

        add.group('Scripts')
            .style({ flat: true })
            .build(() => {
                add.list.view<InstallerEntry, InstallerEntry>()
                    .sorting(true)
                    .sortOnBuild(true)
                    .row((item, parent, id) => {
                        const listItem = new DzCheckListItem(parent, DzCheckListItem.CheckBox, id)
                        listItem.on = item.value.selected
                        listItem.setText(0, '')
                        return listItem
                    })
                    .items(this.items$)
                    .columns(['Install', 'Action', 'Description', 'Path', 'Targets'], (index, width) => {
                        if (index === 0) return Math.max(width, 70)
                        if (index === 1) return Math.max(width * 2, 240)
                        if (index === 2) return Math.max(width * 2, 240)
                        return Math.max(width, 160)
                    })
                    .text((item) => [
                        '',
                        String(item.value.action.text ?? ''),
                        String(item.value.action.description ?? ''),
                        String(item.value.action.filePath ?? ''),
                        describeTargets(item.value),
                    ])
                    .data((item) => item.value)
                    .filter({
                        keywords: this.keywords$,
                        field: (listItem) => [
                            listItem.text(1),
                            listItem.text(2),
                            listItem.text(3),
                            listItem.text(4),
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

    private setVisibleSelections(onOff: boolean) {
        if (!this.listView) return

        if (!this.keywords$.value?.trim()) {
            checkAll(this.listView, onOff)
        }

        this.listView.getItems(DzListView.All).forEach((item) => {
            if (!item.visible || !(item as any).inherits('DzCheckListItem')) return

            const checkbox = item as DzCheckListItem
            checkbox.on = onOff

            const data = getDataItem<InstallerEntry>(item)
            if (!data) return
            data.selected = onOff
        })
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

const saveSelections = (settingsPath: string, entries: InstallerEntry[]) => {
    const settings = new InstallerSettings(settingsPath)
    const persisted = entries.reduce((result, entry) => {
        result[toKey(entry.action)] = {
            selected: entry.selected
        }
        return result
    }, {} as Record<string, InstallerPersistedState>)

    settings.saveSelections(persisted)
}

const runDialog = (actions: CustomAction[], settingsPath: string): InstallerEntry[] | null => {
    const settings = new InstallerSettings(settingsPath)
    settings.loadSelections()

    const entries = buildEntries(actions)
    const dialog = new InstallerSelectionDialog(entries)
    return dialog.ok() ? dialog.getSelections() : null
}

export const showSetupCustomActionsDialog = (actions: CustomAction[], settingsPath: string) => {
    const selections = runDialog(actions, settingsPath)
    if (!selections) return

    debug(`[Setup] applying ${selections.filter(selection => selection.selected).length}/${selections.length} selected actions`)

    const removedToolbarNames = new CustomSet<string>()

    progress('Setting Up Scripts', selections, (selection) => {
        debug(`[Setup] ${selection.selected ? 'install' : 'remove'} "${selection.action.text}"`)

        if (selection.selected) {
            applyCustomActionTargets(selection.action, {
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
        stillSelected.forEach(s => addToToolbar(s.action))
        debug(`[Setup] Toolbar ${toolbarName} rebuilt with ${stillSelected.length} remaining actions`)

        if (stillSelected.length === 0) {
            cleanupEmptyToolbar(toolbarName)
        }
    })

    saveSelections(settingsPath, selections)
}
