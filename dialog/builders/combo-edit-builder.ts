import { Observable } from '@dsf/lib/observable';
import { WidgetBuilderBase, createWidget } from './widget-builder';
import { WidgetBuilderContext } from './widgets-builder';

export class ComboEditBuilder extends WidgetBuilderBase<DzComboEdit> {
    constructor(context: WidgetBuilderContext) {
        super(createWidget(context).build(DzComboEdit));
    }

    items(items: string[]): this {
        this.widget.insertItems(0, items)
        return this
    }

    changed(bind: Observable<string>): this {
        this.widget.text = bind.value
        this.widget.itemChanged.scriptConnect((text) => {
            bind.value = text
        })
        bind.connect((text) => {
            this.widget.text = text
        })
        return this
    }

    edited(bind: Observable<string>): this {
        this.widget.text = bind.value
        this.widget.textEdited.scriptConnect((text) => {
            bind.value = text
        })
        bind.connect((text) => {
            this.widget.text = text
        })
        return this
    }
}