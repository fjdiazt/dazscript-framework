import { WidgetBuilderBase, createWidget } from './widget-builder'
import { WidgetBuilderContext } from './widgets-builder'

export default class SliderBuilder extends WidgetBuilderBase<DzFloatSlider> {
    constructor(context: WidgetBuilderContext) {
        super(createWidget(context).build(DzFloatSlider))
    }

    value(value: number): this {
        this.widget.value = value
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
}