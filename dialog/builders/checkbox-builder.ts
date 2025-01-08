import { Observable } from '@dsf/lib/observable';
import { WidgetBuilderBase, createWidget } from './widget-builder';
import { WidgetBuilderContext } from './widgets-builder';

export default class CheckBoxBuilder extends WidgetBuilderBase<DzCheckBox> {
    constructor(context: WidgetBuilderContext) {
        super(createWidget(context).build(DzCheckBox))
    }

    label(text: string): this {
        this.widget.text = text ?? ''
        return this
    }

    value(property: Observable<boolean>): this {
        this.widget.checked = property.value
        property.connect((value) => {
            this.widget.checked = value
        })
        this.widget.toggled.scriptConnect((value) => {
            property.value = value
        })
        return this
    }

    build(): DzCheckBox {
        return this.widget
    }

}