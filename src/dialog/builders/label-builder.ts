import { WidgetBuilderBase, createWidget } from './widget-builder';
import { WidgetBuilderContext } from './widgets-builder';

export default class LabelBuilder extends WidgetBuilderBase<DzLabel> {
    constructor(context: WidgetBuilderContext) {
        super(createWidget(context).build(DzLabel));

    }

    text(text: string): this {
        this.widget.text = text;
        return this;
    }

    build(): DzLabel {
        return this.widget;
    }
}
