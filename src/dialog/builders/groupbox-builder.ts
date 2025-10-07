import { Observable } from '@dsf/lib/observable';
import { Direction } from '../shared';
import LayoutBuilder from './layout-builder';
import { IWidgetBuilder, createWidget } from './widget-builder';
import { WidgetBuilderContext } from './widgets-builder';

export default class GroupBoxBuilder implements IWidgetBuilder<DzGroupBox> {
    private _title: Observable<string>
    private _direction: Direction = 'vertical'
    private _style: { flat?: boolean }
    private _visible: Observable<boolean>
    private _columns: number = 1

    constructor(private context: WidgetBuilderContext) {
    }

    title(text: string | Observable<string>): this {
        this._title = typeof text === 'string'
            ? new Observable(text)
            : text
        return this
    }

    vertical(): this {
        this._direction = 'vertical'
        return this
    }

    horizontal(): this {
        this._direction = 'horizontal'
        return this
    }

    orientation(direction: Direction): this {
        this._direction = direction
        return this
    }

    style(options: { flat?: boolean }): this {
        this._style = options
        return this
    }

    flat(): this {
        this._style = { flat: true }
        return this
    }

    visible(value: boolean | Observable<boolean>): this {
        this._visible = typeof value === 'boolean'
            ? new Observable(value)
            : value
        return this
    }

    columns(value: number): this {
        this._columns = value
        return this
    }

    build(then?: (layout: DzVBoxLayout | DzHBoxLayout, groupBox: DzGroupBox) => void): DzGroupBox {
        let groupBox = createWidget(this.context).build(DzGroupBox)

        groupBox.title = this._title?.value
        groupBox.flat = this._style?.flat
        groupBox.columns = this._columns

        this._title?.connect((text) => {
            groupBox.title = text
        })

        new LayoutBuilder(this.context)
            .parent(groupBox)
            .direction(this._direction)
            .build((layout) => {
                then?.(layout, groupBox)
            })

        if (this._visible) {
            if (this._visible.value === false)
                groupBox.hide()
            this._visible.connect((visible) => {
                if (visible)
                    groupBox.show()
                else
                    groupBox.hide()
            })
        }

        return groupBox
    }
}
