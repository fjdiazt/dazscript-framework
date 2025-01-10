import { Observable } from '@dsf/lib/observable';
import { BasicDialog } from './basic-dialog';
import { InputValidator } from './input-validator';

export class InputDialogModel {
    value$: Observable<string> = new Observable()
    validator: InputValidator | null = null

    getNumericValue(): number {
        return parseFloat(this.value$.value).valueOf()
    }

    constructor(validator: InputValidator | null = null) {
        this.validator = validator
    }
}

export class InputDialog extends BasicDialog {
    constructor(title: string, private readonly model: InputDialogModel) {
        super(title);
    }

    protected build(): void {
        let add = this.add

        add.edit().value(this.model.value$).validator(this.model.validator).focus()
    }
}