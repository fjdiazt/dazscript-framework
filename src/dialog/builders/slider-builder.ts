import { Observable } from '@dsf/lib/observable'
import { WidgetBuilderBase, createWidget } from './widget-builder'
import { WidgetBuilderContext } from './widgets-builder'

export default class SliderBuilder extends WidgetBuilderBase<DzFloatSlider | DzIntSlider> {
    constructor(context: WidgetBuilderContext, readonly type: 'float' | 'integer') {
        super(createWidget(context).build(type === 'float' ? DzFloatSlider : DzIntSlider))
    }

    value(value$: number | Observable<number>): this {
        if (typeof value$ === 'number') {
            this.widget.value = value$
        }
        else {
            this.widget.value = value$.value
            value$.connect((value) => {
                this.widget.value = value
            })
            this.widget.valueChanged.scriptConnect((value) => {
                value$.value = value
            })
        }
        return this
    }

    min(min: number): this {
        this.widget.min = min
        return this
    }

    max(max: number): this {
        this.widget.max = max
        return this
    }

    clamped(yesNo: boolean): this {
        this.widget.clamped = yesNo
        return this
    }
}