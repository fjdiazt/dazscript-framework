import { Observable } from '@dsf/lib/observable';
import { createWidget, WidgetBuilderBase } from './widget-builder';
import { WidgetBuilderContext } from './widgets-builder';


export class PathComboBoxBuilder extends WidgetBuilderBase<DzPathComboBox> {
    constructor(context: WidgetBuilderContext, checkBoxes: boolean = false) {
        super(createWidget(context).withArgs([checkBoxes]).build(DzPathComboBox))
    }

    items(items: string[] | Observable<string[]>): this {
        if (items instanceof Array) {
            this.widget.setTypes(items)
        }
        else {
            this.widget.setTypes(items.value)
            items.connect((items) => {
                this.widget.setTypes(items)
            })
        }

        return this
    }
}
