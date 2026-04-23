import { BasicDialog } from '@dsf/dialog/basic-dialog'
import { AppSettings } from '@dsf/lib/settings'
import { config } from './config'

// ── Settings (persisted across runs via DzAppSettings) ───────────────────────

export class RenderSettings extends AppSettings {
    constructor() {
        super(`${config.author}/05-SettingsDialog`)
    }

    quality$       = this.bindString('quality$', 'Medium')
    samples$       = this.bindInt('samples$', 64)
    scale$         = this.bindFloat('scale$', 1.0)
    outputPath$    = this.bindString('outputPath$', '')
    useGpu$        = this.bindBoolean('useGpu$', true)
    verbose$       = this.bindBoolean('verbose$', false)
    format$        = this.bindString('format$', 'PNG')
}

// ── Dialog ───────────────────────────────────────────────────────────────────

export class SettingsDialog extends BasicDialog {
    constructor(private readonly settings: RenderSettings) {
        super('05 Settings Dialog')
    }

    protected build(): void {
        let add      = this.add
        let settings = this.settings

        add.group('Render').build(() => {
            add.horizontal((layout) => {
                layout.spacing = 5
                add.label('Quality:').minWidth(60)
                add.combo()
                    .items(['Low', 'Medium', 'High', 'Ultra'])
                    .selected(settings.quality$)
            })

            add.horizontal((layout) => {
                layout.spacing = 5
                add.label('Samples:').minWidth(60)
                add.slider('integer').value(settings.samples$).min(1).max(512).build()
            })

            add.horizontal((layout) => {
                layout.spacing = 5
                add.label('Scale:').minWidth(60)
                add.slider('float').value(settings.scale$).min(0.1).max(10.0).build()
            })
        })

        add.group('Output').build(() => {
            add.horizontal((layout) => {
                layout.spacing = 5
                add.label('Path:').minWidth(60)
                add.edit()
                    .value(settings.outputPath$)
                    .placeholder('Leave empty for default output path…')
            })

            add.group('Format').horizontal().style({ flat: true }).build(() => {
                add.radio('PNG')
                    .value(settings.format$.value === 'PNG')
                    .toggled(v => { if (v) settings.format$.value = 'PNG' })
                add.radio('JPEG')
                    .value(settings.format$.value === 'JPEG')
                    .toggled(v => { if (v) settings.format$.value = 'JPEG' })
                add.radio('EXR')
                    .value(settings.format$.value === 'EXR')
                    .toggled(v => { if (v) settings.format$.value = 'EXR' })
            })
        })

        add.group('Options').horizontal().build(() => {
            add.checkbox('Use GPU').value(settings.useGpu$)
            add.checkbox('Verbose').value(settings.verbose$)
        })
    }
}
