import { Observable } from '@dsf/lib/observable';
import { WidgetBuilderBase, createWidget } from './widget-builder';
import { WidgetBuilderContext } from './widgets-builder';

export default class RadioButtonBuilder extends WidgetBuilderBase<DzRadioButton> {
    constructor(context: WidgetBuilderContext) {
        super(createWidget(context).build(DzRadioButton))
    }

    label(text: string): this {
        this.widget.text = text ?? ''
        return this
    }

    value(source: boolean | Observable<boolean>): this {
        if (typeof source === 'boolean') {
            this.widget.checked = source
        }
        else {
            this.widget.checked = source.value
            source.connect((value) => {
                this.widget.checked = value
            })
            this.widget.toggled.scriptConnect((value) => {
                source.value = value
            })
        }
        return this
    }

    toggled(fn: (value: boolean) => void): this {
        this.widget.toggled.scriptConnect((value) => {
            fn(value)
        })
        return this
    }

    build(checkbox?: (checkbox: DzRadioButton) => void): DzRadioButton {
        checkbox?.(this.widget)
        return this.widget
    }

}