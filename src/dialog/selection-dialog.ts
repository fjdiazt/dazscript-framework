import { BasicDialog } from './basic-dialog';
import { Direction } from './shared';

export class SelectionDialogModel {
    options: string[] = [];
    selectedOption: string | null = null;
    selectedIndex: number = -1;
    title: string = "Select an Option";
    groupTitle: string = "";
    orientation: Direction = 'horizontal';
}

export class SelectionDialog extends BasicDialog {
    constructor(private readonly model: SelectionDialogModel) {
        super(model.title);
    }

    protected build(): void {
        this.dialog.showAcceptButton(true);
        this.dialog.showCancelButton(false);
        this.dialog.setAcceptButtonText("Cancel")

        this.add.group(this.model.groupTitle).orientation(this.model.orientation).build((layout) => {
            layout.spacing = 5;
            this.model.options.forEach(option => {
                this.add.button(option).clicked(() => {
                    this.model.selectedOption = option;
                    this.model.selectedIndex = this.model.options.indexOf(option);
                    this.close();
                });
            });
        })
    }

    private buildForm(layout: DzLayout): void {

    }

    ok(): boolean {
        this.run();
        return this.model.selectedOption !== null;
    }

    cancel(): boolean {
        return this.ok() === false
    }
}