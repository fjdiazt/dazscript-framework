import { createUID } from '@dsf/lib/guid';
import { Observable } from '@dsf/lib/observable';
import { WidgetBuilderContext } from './widgets-builder';

export abstract class WidgetBuilderBase<T extends DzWidget> implements IWidgetBuilder<T> {
    constructor(protected readonly widget: T) { }

    enabled<T>(when: boolean | Observable<T>): this {
        if (typeof when === 'boolean') {
            this.widget.enabled = when
        }
        else {
            this.widget.enabled = Boolean(when.value)
            when.connect((value) => {
                this.widget.enabled = Boolean(value)
            })
        }
        return this
    }

    focus(): this {
        this.widget.getWidget().setFocus()
        return this
    }

    clickFocus(): this {
        this.widget.getWidget().focusPolicy = QtFocusPolicy.ClickFocus
        return this
    }

    tabFocus(): this {
        this.widget.getWidget().focusPolicy = QtFocusPolicy.TabFocus
        return this
    }

    noFocus(): this {
        this.widget.getWidget().focusPolicy = QtFocusPolicy.NoFocus
        return this
    }

    toolTip(toolTip: string): this {
        this.widget.toolTip = toolTip
        this.widget.whatsThis = toolTip
        return this
    }

    whatsThis(whatsThis: string): this {
        this.widget.whatsThis = whatsThis
        return this
    }

    visible(value: boolean | Observable<boolean>): this {
        let observable = typeof value === 'boolean'
            ? new Observable(value)
            : value

        if (observable.value)
            this.widget.show()
        else
            this.widget.hide()
        observable.connect((value) => {
            if (value)
                this.widget.show()
            else
                this.widget.hide()
        })
        return this
    }

    build(): T {
        return this.widget
    }
}

export interface IWidgetBuilder<T extends DzWidget> {
    visible(value: boolean | Observable<boolean>): this
    build(): T
}

export class WidgetBuilder {
    private _parent: DzWidget | DzLayout;
    private _args: any[] | null;

    constructor(public readonly context: WidgetBuilderContext) { }

    parent(parent: DzWidget | DzLayout): this {
        this._parent = parent;
        return this;
    }

    withArgs(widgetArgs: any[]): this {
        this._args = widgetArgs;
        return this;
    }

    build<T extends DzWidget>(type: { new(p0: any, p1?: any, p2?: any, p3?: any): T; }, then?: (widget: T) => void): T {
        let parent = this._parent ?? this.context.parent;
        let name = createUID();
        let widget: T;

        if (parent.inherits("DzLayout")) {
            let args = this._args;
            if (!args || args.length === 0) widget = new type(this.context.dialog);
            else if (args.length === 1) widget = new type(this.context.dialog, args[0]);
            else if (args.length === 2) widget = new type(this.context.dialog, args[0], args[1]);
            else if (args.length === 3) widget = new type(this.context.dialog, args[0], args[1], args[2]);
            else throw Error("DzWidget Arguments out of range");
            (<DzLayout>parent).addWidget(widget);
        }
        else {
            widget = new type(parent);
        }

        widget.name = name;
        then?.(widget);

        return widget;
    }
}

export const createWidget = (context: WidgetBuilderContext): WidgetBuilder => {
    return new WidgetBuilder(context)
}

