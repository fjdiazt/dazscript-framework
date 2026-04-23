import { BasicDialog } from '@dsf/dialog/basic-dialog'
import { Observable } from '@dsf/lib/observable'

// ── Model ────────────────────────────────────────────────────────────────────

export class SimpleDialogModel {
    name$    = new Observable('My Object')
    enabled$ = new Observable(true)
    notes$   = new Observable('')
}

// ── Dialog ───────────────────────────────────────────────────────────────────

export class SimpleDialog extends BasicDialog {
    constructor(private readonly model: SimpleDialogModel) {
        super('04 Simple Dialog')
    }

    protected build(): void {
        let add   = this.add
        let model = this.model

        add.group('Object').build(() => {
            add.horizontal((layout) => {
                layout.spacing = 5
                add.label('Name:').minWidth(45)
                add.edit().value(model.name$).placeholder('Enter a name…')
            })

            add.horizontal((layout) => {
                layout.spacing = 5
                add.label('Notes:').minWidth(45)
                add.edit().value(model.notes$).placeholder('Optional notes…')
            })

            add.checkbox('Enabled').value(model.enabled$)
        })

        add.button('Reset').clicked(() => {
            model.name$.value    = 'My Object'
            model.enabled$.value = true
            model.notes$.value   = ''
        })
    }
}
