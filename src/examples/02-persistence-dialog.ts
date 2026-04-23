import { BasicDialog } from '@dsf/dialog/basic-dialog'
import { readFromFile, saveToFile } from '@dsf/helpers/file-helper'
import { AppSettings } from '@dsf/lib/settings'
import { Observable } from '@dsf/lib/observable'
import { config } from './config'

type FilePersistenceState = {
    enabled: boolean
}

export class PersistenceSettings extends AppSettings {
    constructor() {
        super(`${config.author}/02-PersistenceDialog`)
    }

    registryEnabled$ = this.bindBoolean('registryEnabled$', false)
}

export class PersistenceDialogModel {
    readonly settings = new PersistenceSettings()
    readonly registryEnabled$ = this.settings.registryEnabled$
    readonly filePath = `${this.settings.appDataPath}/persistence-dialog.json`
    readonly fileEnabled$ = new Observable(this.readFileState().enabled, () => this.writeFileState())

    private readFileState(): FilePersistenceState {
        return readFromFile<FilePersistenceState>(this.filePath) ?? { enabled: false }
    }

    private writeFileState(): void {
        saveToFile(this.filePath, JSON.stringify({ enabled: this.fileEnabled$.value }, null, 2))
    }
}

export class PersistenceDialog extends BasicDialog {
    constructor(private readonly model: PersistenceDialogModel) {
        super('02 Persistence Dialog')
    }

    protected build(): void {
        let add = this.add
        let model = this.model

        this.builder.options({ resizable: true, width: 620, height: 360 })
        this.dialog.setAcceptButtonText('Close')

        add.label([
            'Toggle either checkbox, close this dialog, then run the example again.',
            'The checkbox values should reopen with the last saved state.',
        ].join('\n')).wordWrap().build()

        add.group('DzAppSettings').build(() => {
            add.label([
                'Persists through DAZ Studio DzAppSettings.',
                'On Windows this uses the registry-backed application settings store.',
                'On macOS this uses the platform preferences store.',
            ].join('\n')).wordWrap().build()
            add.checkbox('Stored in DzAppSettings').value(model.registryEnabled$)
        })

        add.group('App Data JSON File').build(() => {
            add.label([
                'Persists to a JSON file under DAZ Studio app data.',
                `File: ${model.filePath}`,
            ].join('\n')).wordWrap().build()
            add.checkbox('Stored in app data JSON').value(model.fileEnabled$)
        })
    }
}
