import { BasicDialog } from '@dsf/dialog/basic-dialog'
import { PopupMenuItem } from '@dsf/dialog/builders/popup-menu-builder'
import { getDataItem } from '@dsf/helpers/list-view-helper'
import { AppSettings } from '@dsf/lib/settings'
import { Observable } from '@dsf/lib/observable'
import { TreeNode } from '@dsf/lib/tree-node'
import { config } from './config'

// Types

export interface SceneObject {
    id: number
    name: string
    type: 'Figure' | 'Prop' | 'Light' | 'Camera' | 'Group'
    visible: boolean
    locked: boolean
}

// Settings (all persisted via DzAppSettings)

export class ShowcaseDialogSettings extends AppSettings {
    constructor() {
        super(`${config.author}/06-ShowcaseDialog`)
    }

    // Objects tab
    activeTab$     = this.bindInt('activeTab$', 0)
    flatList$      = this.bindBoolean('flatList$', false)
    showIcons$     = this.bindBoolean('showIcons$', true)
    showVisibleOnly$ = this.bindBoolean('showVisibleOnly$', false)
    splitterState$ = this.bindString('splitterState$', '')
    filterType$    = this.bindString('filterType$', 'All')

    // Settings tab - Render
    quality$   = this.bindString('quality$', 'Standard')
    samples$   = this.bindInt('samples$', 64)
    scale$     = this.bindFloat('scale$', 1.0)

    // Settings tab - Export
    exportFormat$ = this.bindString('exportFormat$', 'JSON')
    outputPath$   = this.bindString('outputPath$', '')
    autoSave$     = this.bindBoolean('autoSave$', false)

    // Settings tab - Behaviour
    notifications$ = this.bindBoolean('notifications$', true)
    logLevel$      = this.bindString('logLevel$', 'Info')

    // About tab
    showFilters$ = this.bindBoolean('showFilters$', false)
}

// Model

export class ShowcaseDialogModel {
    readonly settings = new ShowcaseDialogSettings()

    objects$        = new Observable<TreeNode<SceneObject>[]>([])
    selectedObject$ = new Observable<SceneObject>()
    refreshObjects$ = new Observable<void>()
    keywords$       = new Observable('')
    logEntries$     = new Observable<string[]>([])
    sceneStats$     = new Observable('')
    selectedSummary$ = new Observable('No object selected')

    // Detail panel fields - updated externally when selectedObject$ changes
    detailName$    = new Observable('')
    detailType$    = new Observable('')
    detailVisible$ = new Observable(false)
    detailLocked$  = new Observable(false)
}

// Dialog

export class ShowcaseDialog extends BasicDialog {
    private sceneListView: DzListView | null = null

    constructor(private readonly model: ShowcaseDialogModel) {
        super('06 Showcase Dialog', `${config.author}/06-ShowcaseDialog`)
    }

    protected build(): void {
        let add      = this.add
        let settings = this.model.settings

        this.builder.options({ resizable: true, width: 780, height: 640 })
        this.dialog.setAcceptButtonText('Apply')
        this.dialog.setCancelButtonText('Close')

        this.connectInteractions()

        // Active tab index persists across runs via bindInt.
        add.tab('Objects').bind(settings.activeTab$).build(() => {
            this.buildObjectsTab()
        })
        add.tab('Settings').build(() => {
            this.buildSettingsTab()
        })
        add.tab('About').build(() => {
            this.buildAboutTab()
        })

        this.updateSceneStats()
    }

    // Tab 1: Objects

    private buildObjectsTab(): void {
        let add      = this.add
        let model    = this.model
        let settings = model.settings

        // Toolbar row
        add.group('Search').horizontal().build((layout) => {
            layout.spacing = 4
            add.edit()
                .value(model.keywords$)
                .placeholder('Filter objects...')
                .focus()
            add.label('Type:')
            add.combo()
                .items(['All', 'Figure', 'Prop', 'Light', 'Camera', 'Group'])
                .selected(settings.filterType$)
            add.button('Refresh')
                .clicked(() => model.refreshObjects$.trigger())
                .toolTip('Reload the object list')
            add.button('Apply Checked Rows')
                .clicked(() => this.applyCheckedRows())
                .toolTip('Copies the list checkbox states back to the scene objects.')
        })

        add.horizontal((layout) => {
            layout.spacing = 6
            add.checkbox('Flat List').value(settings.flatList$)
            add.checkbox('Show Icons').value(settings.showIcons$)
            add.checkbox('Visible Only').value(settings.showVisibleOnly$)
            const statsLabel = add.label(model.sceneStats$.value).build()
            model.sceneStats$.connect(text => { statsLabel.text = text })
        })

        // Splitter - position persisted via bindString
        add.splitter()
            .state(settings.splitterState$)
            .strech(2, 1)
            .items(
                // Left pane: tree list with filter + context menu
                add.group().style({ flat: true }).build(() => {
                    add.list.view<SceneObject, SceneObject>()
                        .row((item, parent, id) => {
                            let obj = item.value as SceneObject
                            let listItem = new DzCheckListItem(parent, item.isLeaf ? DzCheckListItem.CheckBox : DzCheckListItem.CheckBoxController, id)
                            listItem.selectable = true
                            listItem.on = obj.visible
                            return listItem
                        })
                        .expanded(true)
                        .flat(settings.flatList$)
                        .refresh(model.refreshObjects$)
                        .items(model.objects$)
                        .columns(['Visible', 'Name', 'Type', 'Locked'])
                        .text(item => [
                            '',
                            this.getDisplayName(item.value),
                            item.value?.type ?? '',
                            item.value?.locked  ? 'Yes' : 'No',
                        ])
                        .data(item => item.value)
                        .selected(model.selectedObject$)
                        .filter({
                            keywords: model.keywords$,
                            field: li => li.text(0),
                            selectOnFilter: true,
                            filters: li => {
                                let obj  = getDataItem<SceneObject>(li)
                                if (!obj) return true
                                let type = settings.filterType$.value
                                let matchesType = type === 'All' || obj.type === type
                                let matchesVisibility = !settings.showVisibleOnly$.value || obj.visible
                                return matchesType && matchesVisibility
                            },
                        })
                        .contextMenu((_, li) => {
                            let obj   = getDataItem<SceneObject>(li)
                            let label = obj?.name ?? 'item'
                            let items: PopupMenuItem[] = [
                                {
                                    text: `Select "${label}"`,
                                    activated: () => { /* select in viewport */ },
                                },
                                {
                                    text: obj?.visible ? 'Hide' : 'Show',
                                    activated: () => {
                                        if (obj) obj.visible = !obj.visible
                                        model.refreshObjects$.trigger()
                                    },
                                },
                                { text: '' },   // separator
                                {
                                    text: 'Duplicate',
                                    activated: () => { /* duplicate */ },
                                },
                                {
                                    text: 'Delete',
                                    activated: () => { /* delete */ },
                                },
                            ]
                            return add.contextMenu().items(...items).build()
                        })
                        .build((listView) => {
                            this.sceneListView = listView
                            listView.allColumnsShowFocus = true
                        })
                }),

                // Right pane: detail panel for selected object
                add.group('Details').build(() => {
                    add.horizontal((layout) => {
                        layout.spacing = 4
                        add.label('Name:').minWidth(45)
                        add.edit().readOnly().value(model.detailName$)
                    })
                    add.horizontal((layout) => {
                        layout.spacing = 4
                        add.label('Type:').minWidth(45)
                        add.edit().readOnly().value(model.detailType$)
                    })
                    add.group('Flags').horizontal().build(() => {
                        add.checkbox('Visible').value(model.detailVisible$)
                        add.checkbox('Locked').value(model.detailLocked$)
                    })
                    const summaryLabel = add.label(model.selectedSummary$.value).wordWrap().build()
                    model.selectedSummary$.connect(text => { summaryLabel.text = text })
                    add.group('Scene Node').build(() => {
                        // NodeSelection lets the user pick any node from the scene.
                        add.nodeSelection().build()
                    })
                })
            )
            .build()
    }

    // Tab 2: Settings

    private buildSettingsTab(): void {
        let add      = this.add
        let settings = this.model.settings

        add.horizontal((layout) => {
            layout.spacing = 8

            // Left column
            add.vertical(() => {
                add.group('Display').build(() => {
                    add.checkbox('Flat List').value(settings.flatList$)
                    add.checkbox('Show Icons').value(settings.showIcons$)
                    add.checkbox('Visible Only').value(settings.showVisibleOnly$)
                    add.horizontal((layout) => {
                        layout.spacing = 4
                        add.label('Object Type:').minWidth(80)
                        add.combo()
                            .items(['All', 'Figure', 'Prop', 'Light', 'Camera', 'Group'])
                            .selected(settings.filterType$)
                    })
                })

                // Radio buttons - initialize from persisted quality value;
                // toggled() writes back when the user picks a different option.
                add.group('Render Quality').build(() => {
                    add.radio('Draft')
                        .value(settings.quality$.value === 'Draft')
                        .toggled(v => {
                            if (!v) return
                            settings.quality$.value = 'Draft'
                            settings.samples$.value = 16
                            settings.scale$.value = 0.5
                        })
                    add.radio('Standard')
                        .value(settings.quality$.value === 'Standard')
                        .toggled(v => {
                            if (!v) return
                            settings.quality$.value = 'Standard'
                            settings.samples$.value = 64
                            settings.scale$.value = 1.0
                        })
                    add.radio('High')
                        .value(settings.quality$.value === 'High')
                        .toggled(v => {
                            if (!v) return
                            settings.quality$.value = 'High'
                            settings.samples$.value = 256
                            settings.scale$.value = 2.0
                        })
                })
            })

            // Right column
            add.vertical(() => {
                add.group('Render').build(() => {
                    add.horizontal((layout) => {
                        layout.spacing = 4
                        add.label('Samples:').minWidth(55)
                        add.slider('integer')
                            .value(settings.samples$)
                            .min(1).max(512)
                            .build()
                    })
                    add.horizontal((layout) => {
                        layout.spacing = 4
                        add.label('Scale:').minWidth(55)
                        add.slider('float')
                            .value(settings.scale$)
                            .min(0.1).max(5.0)
                            .build()
                    })
                })

                add.group('Export').build(() => {
                    add.horizontal((layout) => {
                        layout.spacing = 4
                        add.label('Output:').minWidth(55)
                        add.edit()
                            .value(settings.outputPath$)
                            .placeholder('Default output path...')
                    })
                    add.horizontal((layout) => {
                        layout.spacing = 4
                        add.label('Format:').minWidth(55)
                        // ComboBox - two-way bind to persisted string
                        add.combo()
                            .items(['JSON', 'XML', 'CSV'])
                            .selected(settings.exportFormat$)
                    })
                    add.checkbox('Auto Save').value(settings.autoSave$)
                    add.label('Auto Save enables notifications and switches the log level to Debug.').wordWrap().build()
                })
            })
        })

        // Color pickers - read the final color from the widget on accept
        add.group('Colors').horizontal().build(() => {
            add.vertical(() => {
                add.label('Background:').build()
                add.color().build()
            })
            add.vertical(() => {
                add.label('Foreground:').build()
                add.color().build()
            })
        })

        add.group('Behaviour').horizontal().build(() => {
            add.checkbox('Notifications').value(settings.notifications$)
            add.horizontal((layout) => {
                layout.spacing = 4
                add.label('Log Level:')
                // ComboEdit: user can pick from list OR type a custom level
                add.comboEdit()
                    .items(['Debug', 'Info', 'Warning', 'Error'])
                    .changed(settings.logLevel$)
            })
        })
    }

    // Tab 3: About

    private buildAboutTab(): void {
        let add      = this.add
        let model    = this.model
        let settings = model.settings

        add.group('About This Example').build(() => {
            add.label([
                'DAZScript Framework - Showcase Dialog (Example 06)',
                '',
                'Widgets demonstrated in this dialog:',
                '  - Tabs with persisted active-tab index (bindInt)',
                '  - Splitter with persisted position (bindString)',
                '  - list.view - columns, keyword filter, custom filters,',
                '      checkbox rows, context menu, refresh trigger, flat/tree toggle,',
                '      expanded, data binding, selection binding',
                '  - list.box - scrollable list with multi-select',
                '  - GroupBox - vertical / horizontal / flat style / visible toggle',
                '  - Label - wordWrap, minWidth, alignment',
                '  - LineEdit - value binding, placeholder, readOnly',
                '  - CheckBox, RadioButton - Observable two-way binding',
                '  - Button - clicked, toggle, toolTip',
                '  - Slider - integer and float with min/max',
                '  - ColorPicker (DzColorWgt)',
                '  - ComboBox - items + selected binding',
                '  - ComboEdit - items + changed/edited binding',
                '  - NodeSelection combo (scene node picker)',
                '  - All settings persisted via AppSettings (DzAppSettings)',
            ].join('\n')).wordWrap(true).build()
        })

        // Log list - populated externally; demonstrates Observable<string[]> binding
        add.group('Recent Log').build(() => {
            add.list.box()
                .items(model.logEntries$)
                .mode('single')
                .build()
        })

        // Conditional filter row - group visible when showFilters$ is true
        add.group('Optional Filters').horizontal()
            .visible(settings.showFilters$)
            .build(() => {
                add.label('Tag:').minWidth(30)
                add.comboEdit()
                    .items(['render', 'test', 'draft', 'final'])
                    .build()
            })

        add.horizontal((layout) => {
            layout.spacing = 4
            add.checkbox('Show Filters').value(settings.showFilters$)
        })
    }

    private connectInteractions(): void {
        let model = this.model
        let settings = model.settings

        settings.filterType$.connect(() => model.refreshObjects$.trigger())
        settings.showVisibleOnly$.connect(() => model.refreshObjects$.trigger())
        settings.showIcons$.connect(() => model.refreshObjects$.trigger())
        settings.flatList$.connect(() => model.refreshObjects$.trigger())

        settings.autoSave$.connect((enabled) => {
            if (!enabled) return
            settings.notifications$.value = true
            settings.logLevel$.value = 'Debug'
            this.addLog('Auto Save enabled; notifications and Debug logging selected.')
        })

        model.objects$.connect(() => this.updateSceneStats())
        model.refreshObjects$.connect(() => this.updateSceneStats())

        model.selectedObject$.connect(obj => {
            model.selectedSummary$.value = obj
                ? `${obj.name}: ${obj.type}, ${obj.visible ? 'visible' : 'hidden'}, ${obj.locked ? 'locked' : 'unlocked'}`
                : 'No object selected'
        })

        model.detailVisible$.connect((visible) => {
            let obj = model.selectedObject$.value
            if (!obj || obj.visible === visible) return
            obj.visible = visible
            this.addLog(`${obj.name} visibility changed from the detail checkbox.`)
            model.refreshObjects$.trigger()
        })

        model.detailLocked$.connect((locked) => {
            let obj = model.selectedObject$.value
            if (!obj || obj.locked === locked) return
            obj.locked = locked
            this.addLog(`${obj.name} lock state changed from the detail checkbox.`)
            model.refreshObjects$.trigger()
        })
    }

    private getDisplayName(obj: SceneObject | null): string {
        if (!obj) return ''
        if (!this.model.settings.showIcons$.value) return obj.name

        const prefixByType: Record<SceneObject['type'], string> = {
            Figure: '[F]',
            Prop: '[P]',
            Light: '[L]',
            Camera: '[C]',
            Group: '[G]',
        }

        return `${prefixByType[obj.type]} ${obj.name}`
    }

    private addLog(message: string): void {
        let entries = this.model.logEntries$.value.slice()
        entries.push(`[Info]  ${message}`)
        if (entries.length > 8) entries.shift()
        this.model.logEntries$.value = entries
    }

    private updateSceneStats(): void {
        let objects = this.getAllObjects()
        let visible = objects.filter(obj => obj.visible).length
        let locked = objects.filter(obj => obj.locked).length
        this.model.sceneStats$.value = `${visible}/${objects.length} visible, ${locked} locked`
    }

    private getAllObjects(): SceneObject[] {
        let objects: SceneObject[] = []
        this.model.objects$.value.forEach(root => {
            root.forEach(node => {
                if (node.value) objects.push(node.value)
            })
        })
        return objects
    }

    private applyCheckedRows(): void {
        if (!this.sceneListView) return

        this.sceneListView.getItems(DzListView.All).forEach(item => {
            if (!(item as any).inherits('DzCheckListItem')) return

            let obj = getDataItem<SceneObject>(item)
            if (!obj) return

            let checkbox = item as DzCheckListItem
            obj.visible = checkbox.state === 0 && !checkbox.on
                ? false
                : checkbox.on
        })

        this.addLog('List checkbox states applied to scene objects.')
        this.model.refreshObjects$.trigger()
    }
}
