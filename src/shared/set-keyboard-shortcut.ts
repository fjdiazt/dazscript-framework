import { BasicDialog } from '@dsf/dialog/basic-dialog';
import { debug } from '@dsf/common/log';
import { findAction, findActionsForShortcut, setActionShortcut } from '@dsf/helpers/action-helper';
import { contains } from '@dsf/helpers/array-helper';
import { confirm } from '@dsf/helpers/message-box-helper';
import { Observable } from '@dsf/lib/observable';

class KeyboardShortcutModel {
    actionLabel: string
    actionName: string
    shortcut = new Observable('')
    conflict = new Observable('')
    control = new Observable(false)
    alt = new Observable(false)
    shift = new Observable(false)
    windows = new Observable(false)
}

const letters = [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '-'
]

const keys = [
    'SPACE', 'HOME', 'END', 'INS', 'PLUS', 'MINUS',
    'RIGHT', 'LEFT', 'UP', 'DOWN', 'TAB', 'BACKSPACE', 'COMMA', 'PERIOD', 'PGUP', 'PGDOWN', '-',
    'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10',
    'F11', 'F12', 'F13', 'F14', 'F15', 'F16', 'F17', 'F18', 'F19',
    'F20', 'F21', 'F22', 'F23', 'F24',
];

class KeyboardShortcutDialog extends BasicDialog {
    private key = new Observable('')

    constructor(private model: KeyboardShortcutModel) {
        super('Keyboard Shortcut');
    }

    protected build(): void {
        let add = this.add
        let model = this.model
        this.dialog.setAcceptButtonEnabled(false)
        this.dialog.showHelpButton(false)
        this.builder.context.layout.margin = 5
        this.dialog.minWidth = 250

        this.key.intercept((_, current) => {
            let value = current
            if (current.length > 1 && !contains(keys, current))
                value = current[1]
            if (value.length === 1)
                value = value.toUpperCase()
            return value
        })
        this.key.connect((text) => {
            model.shortcut.value = this.getShortcut(text)
        })
        model.shortcut.connect((shortcut) => {
            debug(`[ShortcutDialog] action="${model.actionName}" shortcut="${shortcut}"`)
            model.conflict.value = this.getConflictMessage(shortcut)
        })

        const metaKeys = [model.control, model.alt, model.shift, model.windows];
        for (const observable of metaKeys) {
            observable.connect(() => this.key.trigger());
        }

        this.key.connect((text) => {
            this.dialog.setAcceptButtonEnabled(Boolean(text))
        })

        add.group('Assign Keyboard Shortcut').build((layout) => {
            layout.spacing = 5
            add.edit().value(model.actionLabel).readOnly()
            add.comboEdit().focus().items([...letters, ...keys]).changed(this.key).edited(this.key)
            add.checkbox('Control').value(model.control)
            add.checkbox('Option / Alt').value(model.alt)
            add.checkbox('Shift').value(model.shift)
            add.checkbox('Command / Windows').value(model.windows)
            add.group('Shortcut:').style({ flat: true }).build(() => {
                add.edit().value(model.shortcut).readOnly()
            })
            add.group('Status:').style({ flat: true }).build(() => {
                const conflictLabel = add.label('').wordWrap()
                model.conflict.connect((text) => {
                    conflictLabel.build().text = text || 'Shortcut is available.'
                })
                conflictLabel.build().text = model.conflict.value || 'Shortcut is available.'
            })
        })
    }

    getShortcut(key: string): string {
        let keys: string[] = []

        if (this.model.control.value) keys.push('CTRL')
        if (this.model.alt.value) keys.push('ALT')
        if (this.model.shift.value) keys.push('SHIFT')
        if (this.model.windows.value) keys.push('WIN')

        keys.push(key)

        return keys.join('+')
    }

    private getConflictMessage(shortcut: string): string {
        if (!shortcut) return ''

        const conflicts = findActionsForShortcut(shortcut)
            .filter(action => action && action.name !== this.model.actionName)

        debug(
            `[ShortcutDialog] conflictCheck action="${this.model.actionName}" shortcut="${shortcut}" conflicts=${conflicts.map(action => action.text || action.name).join(', ')}`
        )

        if (conflicts.length === 0) return ''

        return `Already assigned to: ${conflicts.map(action => action.text || action.name).join(', ')}`
    }
}

export const setKeyboardShortcut = (actionLabel: string, actionName: string) => {
    let model = new KeyboardShortcutModel()
    model.actionLabel = actionLabel
    model.actionName = actionName

    let dialog = new KeyboardShortcutDialog(model)
    let result = dialog.run()

    if (!result || !model.shortcut) return

    const conflicts = findActionsForShortcut(model.shortcut.value)
        .filter(action => action && action.name !== actionName)

    debug(
        `[ShortcutDialog] save action="${actionName}" shortcut="${model.shortcut.value}" conflicts=${conflicts.map(action => action.text || action.name).join(', ')}`
    )

    if (conflicts.length > 0) {
        const conflictText = conflicts.map(action => action.text || action.name).join(', ')
        const response = confirm(`"${model.shortcut.value}" is already assigned to: ${conflictText}\n\nReplace it?`)
        if (!response.ok) return
    }

    setActionShortcut(actionName, model.shortcut.value)
}
