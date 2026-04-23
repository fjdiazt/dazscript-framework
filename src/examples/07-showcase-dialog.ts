import { BasicDialog } from '@dsf/dialog/basic-dialog'
import { PopupMenuItem } from '@dsf/dialog/builders/popup-menu-builder'
import { getDataItem } from '@dsf/helpers/list-view-helper'
import { AppSettings } from '@dsf/lib/settings'
import { Observable } from '@dsf/lib/observable'
import { TreeNode } from '@dsf/lib/tree-node'
import { config } from './config'

// ── Types ────────────────────────────────────────────────────────────────────

export interface SceneObject {
    id: number
    name: string
    type: 'Figure' | 'Prop' | 'Light' | 'Camera' | 'Group'
    visible: boolean
    locked: boolean
}

// ── Settings (all persisted via DzAppSettings) ────────────────────────────────

export class ShowcaseDialogSettings extends AppSettings {
    constructor() {
        super(`${config.author}/07-ShowcaseDialog`)
    }

    // Objects tab
    activeTab$     = this.bindInt('activeTab$', 0)
    flatList$      = this.bindBoolean('flatList$', false)
    showIcons$     = this.bindBoolean('showIcons$', true)
    splitterState$ = this.bindString('splitterState$', '')
    filterType$    = this.bindString('filterType$', 'All')

    // Settings tab — Render
    quality$   = this.bindString('quality$', 'Standard')
    samples$   = this.bindInt('samples$', 64)
    scale$     = this.bindFloat('scale$', 1.0)

    // Settings tab — Export
    exportFormat$ = this.bindString('exportFormat$', 'JSON')
    outputPath$   = this.bindString('outputPath$', '')
    autoSave$     = this.bindBoolean('autoSave$', false)

    // Settings tab — Behaviour
    notifications$ = this.bindBoolean('notifications$', true)
    logLevel$      = this.bindString('logLevel$', 'Info')

    // About tab
    showFilters$ = this.bindBoolean('showFilters$', false)
}

// ── Model ─────────────────────────────────────────────────────────────────────

export class ShowcaseDialogModel {
    readonly settings = new ShowcaseDialogSettings()

    objects$        = new Observable<TreeNode<SceneObject>[]>([])
    selectedObject$ = new Observable<SceneObject>()
    refreshObjects$ = new Observable<void>()
    keywords$       = new Observable('')
    logEntries$     = new Observable<string[]>([])

    // Detail panel fields — updated externally when selectedObject$ changes
    detailName$    = new Observable('')
    detailType$    = new Observable('')
    detailVisible$ = new Observable(false)
    detailLocked$  = new Observable(false)
}

// ── Dialog ────────────────────────────────────────────────────────────────────

export class ShowcaseDialog extends BasicDialog {
    constructor(private readonly model: ShowcaseDialogModel) {
        super('07 Showcase Dialog', `${config.author}/07-ShowcaseDialog`)
    }

    protected build(): void {
        let add      = this.add
        let settings = this.model.settings

        this.builder.options({ resizable: true, width: 780, height: 640 })
        this.dialog.setAcceptButtonText('Apply')
        this.dialog.setCancelButtonText('Close')

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
    }

    // ── Tab 1: Objects ────────────────────────────────────────────────────────

    private buildObjectsTab(): void {
        let add      = this.add
        let model    = this.model
        let settings = model.settings

        // Toolbar row
        add.group('Search').horizontal().build((layout) => {
            layout.spacing = 4
            add.edit()
                .value(model.keywords$)
                .placeholder('Filter objects…')
                .focus()
            add.label('Type:')
            add.combo()
                .items(['All', 'Figure', 'Prop', 'Light', 'Camera', 'Group'])
                .selected(settings.filterType$)
            add.button('Refresh')
                .clicked(() => model.refreshObjects$.trigger())
                .toolTip('Reload the object list')
        })

        add.horizontal((layout) => {
            layout.spacing = 6
            add.checkbox('Flat List').value(settings.flatList$)
            add.checkbox('Show Icons').value(settings.showIcons$)
        })

        // Splitter — position persisted via bindString
        add.splitter()
            .state(settings.splitterState$)
            .strech(2, 1)
            .items(
                // Left pane: tree list with filter + context menu
                add.group().style({ flat: true }).build(() => {
                    add.list.view<SceneObject>()
                        .expanded(true)
                        .flat(settings.flatList$)
                        .refresh(model.refreshObjects$)
                        .items(model.objects$)
                        .columns(['Name', 'Type', 'Visible', 'Locked'])
                        .text(item => [
                            item.name,
                            item.value?.type ?? '',
                            item.value?.visible ? 'Yes' : 'No',
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
                                return type === 'All' || obj.type === type
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
                        .build()
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
                    add.group('Scene Node').build(() => {
                        // NodeSelection lets the user pick any node from the scene.
                        add.nodeSelection().build()
                    })
                })
            )
            .build()
    }

    // ── Tab 2: Settings ───────────────────────────────────────────────────────

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
                    add.horizontal((layout) => {
                        layout.spacing = 4
                        add.label('Object Type:').minWidth(80)
                        add.combo()
                            .items(['All', 'Figure', 'Prop', 'Light', 'Camera', 'Group'])
                            .selected(settings.filterType$)
                    })
                })

                // Radio buttons — initialize from persisted quality value;
                // toggled() writes back when the user picks a different option.
                add.group('Render Quality').build(() => {
                    add.radio('Draft')
                        .value(settings.quality$.value === 'Draft')
                        .toggled(v => { if (v) settings.quality$.value = 'Draft' })
                    add.radio('Standard')
                        .value(settings.quality$.value === 'Standard')
                        .toggled(v => { if (v) settings.quality$.value = 'Standard' })
                    add.radio('High')
                        .value(settings.quality$.value === 'High')
                        .toggled(v => { if (v) settings.quality$.value = 'High' })
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
                            .placeholder('Default output path…')
                    })
                    add.horizontal((layout) => {
                        layout.spacing = 4
                        add.label('Format:').minWidth(55)
                        // ComboBox — two-way bind to persisted string
                        add.combo()
                            .items(['JSON', 'XML', 'CSV'])
                            .selected(settings.exportFormat$)
                    })
                    add.checkbox('Auto Save').value(settings.autoSave$)
                })
            })
        })

        // Color pickers — read the final color from the widget on accept
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

    // ── Tab 3: About ─────────────────────────────────────────────────────────

    private buildAboutTab(): void {
        let add      = this.add
        let model    = this.model
        let settings = model.settings

        add.group('About This Example').build(() => {
            add.label([
                'DAZScript Framework — Showcase Dialog (Example 07)',
                '',
                'Widgets demonstrated in this dialog:',
                '  • Tabs with persisted active-tab index (bindInt)',
                '  • Splitter with persisted position (bindString)',
                '  • list.view — columns, keyword filter, custom filters,',
                '      context menu, refresh trigger, flat/tree toggle,',
                '      expanded, data binding, selection binding',
                '  • list.box — scrollable list with multi-select',
                '  • GroupBox — vertical / horizontal / flat style / visible toggle',
                '  • Label — wordWrap, minWidth, alignment',
                '  • LineEdit — value binding, placeholder, readOnly',
                '  • CheckBox, RadioButton — Observable two-way binding',
                '  • Button — clicked, toggle, toolTip',
                '  • Slider — integer and float with min/max',
                '  • ColorPicker (DzColorWgt)',
                '  • ComboBox — items + selected binding',
                '  • ComboEdit — items + changed/edited binding',
                '  • NodeSelection combo (scene node picker)',
                '  • All settings persisted via AppSettings (DzAppSettings)',
            ].join('\n')).wordWrap(true).build()
        })

        // Log list — populated externally; demonstrates Observable<string[]> binding
        add.group('Recent Log').build(() => {
            add.list.box()
                .items(model.logEntries$)
                .mode('single')
                .build()
        })

        // Conditional filter row — group visible when showFilters$ is true
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
}
