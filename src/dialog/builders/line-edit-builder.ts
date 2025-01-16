import { Observable } from '@dsf/lib/observable';
import { InputValidator } from '../input-validator';
import { WidgetBuilderBase, createWidget } from './widget-builder';
import { WidgetBuilderContext } from './widgets-builder';

export default class LineEditBuilder extends WidgetBuilderBase<DzLineEdit> {
    private inputValidator: InputValidator
    private minValue?: number
    private maxValue?: number

    constructor(context: WidgetBuilderContext) {
        super(createWidget(context).build(DzLineEdit))
    }

    placeholder(text: string): this {
        this.widget.placeholderText = text
        return this
    }

    focus(): this {
        this.widget.getWidget().setFocus()
        return this
    }

    validator(validator: InputValidator | null): this {
        if (validator === null) return this
        this.inputValidator = validator
        let settings = new DzSettings()
        settings.setStringValue("validator", InputValidator[validator]);
        this.widget.setValidator(settings)
        return this
    }

    /**
     * Sets the min value of the input when validator is set to in or float
     * @param minValue
     * @returns
     */
    min(minValue: number): this {
        this.minValue = minValue
        return this
    }

    /**
     * Sets the max value of the input when validator is set to in or float
     * @param maxValue
     * @returns
     */
    max(maxValue: number): this {
        this.maxValue = maxValue
        return this
    }

    /**
     * Clamps the input to min and max values. Only works when validator is set to int or float
     * @param min
     * @param max
     * @returns
     */
    clamp(min: number, max: number): this {
        return this.min(min).max(max)
    }

    readOnly(onOff?: Observable<boolean> | null): this {
        if (onOff == null) {
            this.widget.readOnly = true
            return this
        }
        else {
            this.widget.readOnly = onOff.value
            onOff.connect((value) => {
                this.widget.readOnly = value
            })
        }
        return this
    }

    value(text_: string | Observable<string>): this {
        if (typeof text_ === 'string') {
            this.widget.text = text_
        }
        else if (text_ instanceof Observable) {
            this.widget.text = text_.value;
            this.widget.textChanged.scriptConnect((text: string) => {
                text_.value = this.clampValue(text);
            });
            text_.connect((text: string) => {
                this.widget.text = text;
            });
        }

        return this;
    }

    private clampValue(text: string): string {
        if (this.inputValidator === InputValidator.int || this.inputValidator === InputValidator.float) {
            let value = Number(text);
            if (!isNaN(value)) {
                if (this.minValue !== undefined) {
                    value = Math.max(value, this.minValue);
                }
                if (this.maxValue !== undefined) {
                    value = Math.min(value, this.maxValue);
                }
                return String(value);
            }
        }
        else if (this.maxValue && text.length > this.maxValue)
            text = text[this.maxValue]

        return text;
    }


    build(then?: (lineEdit: DzLineEdit) => void): DzLineEdit {
        then?.(this.widget);
        return this.widget;
    }
}
