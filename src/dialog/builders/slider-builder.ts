import { Observable } from '@dsf/lib/observable'
import { WidgetBuilderBase, createWidget } from './widget-builder'
import { WidgetBuilderContext } from './widgets-builder'

export default class SliderBuilder extends WidgetBuilderBase<DzFloatSlider> {
    constructor(context: WidgetBuilderContext) {
        super(createWidget(context).build(DzFloatSlider))
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