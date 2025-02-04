import { Observable } from '@dsf/lib/observable';
import { WidgetBuilderBase, createWidget } from './widget-builder';
import { WidgetBuilderContext } from './widgets-builder';

export class NodeSelectionComboBoxBuilder extends WidgetBuilderBase<DzNodeSelectionComboBox> {
    constructor(context: WidgetBuilderContext) {
        super(createWidget(context).withArgs(['DzNode', true]).build(DzNodeSelectionComboBox))
    }

    node(node: Observable<DzNode>): this {
        this.widget.setNode(node.value)
        node.connect((node) => {
            this.widget.setNode(node)
        })
        return this
    }

    nodes(nodes: Observable<DzNode[]>): this {
        this.widget.setNodes(nodes.value)
        nodes.connect((nodes) => {
            this.widget.setNodes(nodes)
        })
        return this
    }

    selected(node: Observable<DzNode>): this {
        this.widget.setSelectedNode(node.value)
        node.connect((node) => {
            this.widget.setSelectedNode(node)
        })
        return this
    }

    value(node: Observable<DzNode>): this {
        this.widget.nodeSelectionChanged.scriptConnect(() => {
            node.value = this.widget.getSelectedNode()
        })
        this.selected(node)
        return this
    }

    changed(then: (node: DzNode) => void): this {
        this.widget.nodeSelectionChanged.scriptConnect(() => {
            then(this.widget.getSelectedNode())
        })
        return this
    }

    refresh(): void {
        this.widget.update()
    }

    build(then?: (comboBox: DzNodeSelectionComboBox) => void): DzNodeSelectionComboBox {
        return super.build()
    }
}