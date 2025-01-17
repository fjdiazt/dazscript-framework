import { WidgetBuilderBase, createWidget } from './widget-builder';
import { WidgetBuilderContext } from './widgets-builder';

export default class ColorPickerBuilder extends WidgetBuilderBase<DzColorWgt> {
    private _value?: Color
    private _minWidth: number
    private _parent: DzWidget | DzLayout | null = null;

    constructor(private readonly context: WidgetBuilderContext) {
        super(null)
    }

    value(color: Color): this {
        this._value = color
        return this
    }

    minWidth(width: number): this {
        this._minWidth = width
        return this
    }

    parent(parent: DzWidget | DzLayout): this {
        this._parent = parent
        return this
    }

    override build(): DzColorWgt {
        let widget = createWidget(this.context).parent(this._parent ?? this.context.parent).build(DzColorWgt)

        if (this._value) widget.value = this._value
        widget.minWidth = this._minWidth

        return widget;
    }
}