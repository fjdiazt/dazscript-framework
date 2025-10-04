import { Observable } from '@dsf/lib/observable';
import { WidgetBuilderBase, createWidget } from './widget-builder';
import { WidgetBuilderContext } from './widgets-builder';

export class ComboBoxBuilder extends WidgetBuilderBase<DzComboBox> {
    constructor(context: WidgetBuilderContext) {
        super(createWidget(context).build(DzComboBox))
    }

    items(items: string[]): this {
        items.forEach((item, idx) => {
            if (!item)
                this.widget.insertSeparator(idx)
            else
                this.widget.insertItem(idx, item)
        });
        return this
    }

    selected(bind: Observable<string>): this {
        if (bind.value && this.widget.findText(bind.value) >= 0) {
            this.widget.currentText = bind.value
        }
        bind.connect((text) => {
            if (this.widget.findText(text) >= 0) {
                this.widget.currentText = text
            }
        })
        this.widget.textChanged.scriptConnect((text) => {
            bind.value = text
        })
        return this
    }

    build(then?: (comboBox: DzComboBox) => void) {
        then?.(this.widget)
        return this.widget
    }
}