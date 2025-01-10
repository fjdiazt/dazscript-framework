import { BasicDialog } from '@dsf/dialog/basic-dialog';
import { Observable } from '@dsf/lib/observable';
import { AppSettings } from '@dsf/lib/settings';
import { config } from './config';

export class SampleDialogModel extends AppSettings {
    constructor() {
        super(`${config.author}/SampleDialog`);
    }

    selectedNode$ = new Observable<DzNode>()
    nodes$ = new Observable<DzNode[]>()
    nodeLabel$ = new Observable<string>()
    showNode$ = new Observable<boolean>()
    hideNode$ = new Observable<boolean>()
}

export class SampleDialog extends BasicDialog {
    constructor(private readonly model: SampleDialogModel) {
        super(`Sample Dialog`);
    }

    public onNodeChanged?: (node: DzNode) => void

    public onNodeVisibilityChanged?: (node: DzNode, visible: boolean) => void

    protected build(): void {
        let add = this.add
        let model = this.model
        this.dialog.showAcceptButton(false)
        this.dialog.setCancelButtonText(`Close`)

        add.tab('General').build(() => {
            add.group(`Selected Node`).build(() => {
                add.nodeSelection().nodes(model.nodes$).value(model.selectedNode$)
                add.horizontal((layout) => {
                    add.label(`Label:`)
                    layout.addSpacing(10)
                    add.edit().value(model.nodeLabel$)
                })

                add.group(`Visibility`).horizontal().build(() => {
                    add.radio(`Show`).value(model.showNode$).toolTip(`Show the selected node.`).toggled((checked) => { this.onNodeVisibilityChanged(model.selectedNode$.value, checked) })
                    add.radio(`Hide`).value(model.hideNode$).toolTip(`Hide the selected node.`)
                })
            })
        })
    }
}