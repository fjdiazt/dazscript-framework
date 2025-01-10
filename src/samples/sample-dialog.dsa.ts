import { debug, dump } from '@dsf/common/log';
import { action } from '@dsf/core/action-decorator';
import { BaseScript } from '@dsf/core/base-script';
import { error } from '@dsf/helpers/message-box-helper';
import { getNodes, getSelectedNode } from '@dsf/helpers/scene-helper';
import { SampleDialog, SampleDialogModel } from './sample-dialog';

@action({ text: 'Sample Dialog' })
class SampleDialogScript extends BaseScript {
    protected run(): void {
        let sceneNodes = getNodes()
        let selectedNode = getSelectedNode()
        if (!selectedNode) {
            error('Please select a node.')
            return
        }

        let model = new SampleDialogModel()
        model.nodes$.value = sceneNodes

        model.nodeLabel$.connect((label) => {
            if (label === model.selectedNode$.value.getLabel()) return
            model.selectedNode$.value.setLabel(label)
            model.nodes$.value = getNodes()
        })

        let dialog = new SampleDialog(model)

        model.selectedNode$.connect((node) => {
            if (!node) return
            debug(`Selected Node: ${node.getLabel()}`)
            node.select(true)
            model.nodeLabel$.value = node.getLabel()
            model.showNode$.value = node.isVisible()
            model.hideNode$.value = !node.isVisible()
        })
        dialog.onNodeVisibilityChanged = (node, visible) => {
            node.setVisible(visible)
        }

        model.selectedNode$.value = selectedNode

        if (!dialog.run()) {
            debug(`Dialog Cancelled`)
            return
        }

        debug(`Dialog Closed`)
        dump(model)
    }
}
new SampleDialogScript().exec();