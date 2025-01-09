import { Observable } from '@dsf/lib/observable';
import { WidgetBuilderBase, createWidget } from './widget-builder';
import { WidgetBuilderContext } from './widgets-builder';

export class ButtonBuilder extends WidgetBuilderBase<DzPushButton> {
    constructor(context: WidgetBuilderContext) {
        super(createWidget(context).build(DzPushButton))
    }

    text(text: string): this {
        this.widget.text = text
        return this
    }

    toggle(bind: Observable<boolean>): this {
        this.widget.setCheckable(true)
        this.widget.checked = bind.value
        this.widget.toggled.scriptConnect((value) => {
            bind.value = value
        })
        bind.connect((value) => {
            this.widget.checked = value
        })
        return this
    }

    clicked(then: Observable<void> | ((button: DzPushButton) => void)): this {
        if (then instanceof Observable) {
            this.widget.clicked.scriptConnect(() => {
                then.trigger()
            })
        }
        else {
            this.widget.clicked.scriptConnect(() => {
                then?.(this.widget)
            })
        }
        return this
    }

    icon(image: string | Pixmap): this {
        this.widget.pixmap = typeof image === 'string'
            ? new Pixmap(image)
            : image
        return this
    }

    build(then?: (button: DzPushButton) => void): DzPushButton {
        if (!this.widget.text && this.widget.pixmap) this.widget.collapseEmptySpace = true
        then?.(this.widget)
        return this.widget
    }
}