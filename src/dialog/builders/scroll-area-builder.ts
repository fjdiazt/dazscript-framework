import { Observable } from '@dsf/lib/observable'
import { Direction } from '../shared'
import LayoutBuilder from './layout-builder'
import { IWidgetBuilder, createWidget } from './widget-builder'
import { WidgetBuilderContext } from './widgets-builder'

export default class ScrollAreaBuilder implements IWidgetBuilder<DzScrollArea> {
    private direction: Direction = 'vertical'
    private flat_ = false
    private alignment_: number | null = null
    private visible_: Observable<boolean> | null = null
    private height_: number | null = null
    private minHeight_: number | null = null
    private maxHeight_: number | null = null

    constructor(private context: WidgetBuilderContext) { }

    horizontal(): this {
        this.direction = 'horizontal'
        return this
    }

    vertical(): this {
        this.direction = 'vertical'
        return this
    }

    flat(): this {
        this.flat_ = true
        return this
    }

    alignment(value: number): this {
        this.alignment_ = value
        return this
    }

    visible(value: boolean | Observable<boolean>): this {
        this.visible_ = typeof value === 'boolean' ? new Observable(value) : value
        return this
    }

    height(value: number): this {
        this.height_ = value
        return this
    }

    minHeight(value: number): this {
        this.minHeight_ = value
        return this
    }

    maxHeight(value: number): this {
        this.maxHeight_ = value
        return this
    }

    build(then?: (layout: DzVBoxLayout | DzHBoxLayout, scrollArea: DzScrollArea) => void): DzScrollArea {
        const scrollArea = createWidget(this.context).build(DzScrollArea)
        const content = new DzWidget(scrollArea)

        scrollArea.widgetResizable = false
        if (this.flat_) scrollArea.hideFrame()
        if (this.alignment_ !== null) scrollArea.alignment = this.alignment_
        if (this.direction === 'horizontal') scrollArea.setVerticalScrollbarDisplay(false)
        else scrollArea.setHorizontalScrollbarDisplay(false)
        scrollArea.setWidget(content)

        new LayoutBuilder(this.context).parent(content).direction(this.direction).build((layout) => {
            then?.(layout, scrollArea)
        })

        const contentSize = content.getWidget().minimumSizeHint
        content.setFixedSize(contentSize.width, contentSize.height)

        // DAZ exposes no usable scrollbar extent metric to scripts.
        if (this.direction === 'horizontal' && this.height_ === null && this.minHeight_ === null && this.maxHeight_ === null)
            scrollArea.minHeight = scrollArea.maxHeight = contentSize.height + 20
        if (this.height_ !== null) scrollArea.height = this.height_
        if (this.minHeight_ !== null) scrollArea.minHeight = this.minHeight_
        if (this.maxHeight_ !== null) scrollArea.maxHeight = this.maxHeight_

        if (this.visible_) {
            const setVisible = (visible: boolean) => visible ? scrollArea.show() : scrollArea.hide()
            setVisible(this.visible_.value)
            this.visible_.connect(setVisible)
        }

        return scrollArea
    }
}
