import { WidgetBuilderBase, createWidget } from './widget-builder';
import { WidgetBuilderContext } from './widgets-builder';

export class PopupMenuItem {
    id?: number
    text?: string
    checkbox?: boolean
    activated?: (id?: number) => void
}

export class PopupMenuBuilder extends WidgetBuilderBase<DzPopupMenu> {
    constructor(context: WidgetBuilderContext) {
        super(createWidget(context).build(DzPopupMenu));
    }

    parent(parent: DzWidget): this {
        this.widget.reparent(parent, new Point(0, 0))
        return this
    }

    items(...items: PopupMenuItem[]): this {
        items?.forEach((item, idx) => {
            if (!item.text) {
                this.widget.insertSeparator(idx)
            }
            else {
                this.widget.insertTextItem(item.text, item.id ?? idx, idx)

            }

            if (item.activated) this.widget.connectItem(item.id ?? idx, null, item.activated)
        })
        return this
    }

    selected(fn: (idx: number) => void): this {
        this.widget.activated.scriptConnect((idx) => {
            fn(idx)
        })
        return this
    }

    build(then?: (popupMenu: DzPopupMenu) => void): DzPopupMenu {
        then?.(this.widget)
        return this.widget
    }
}