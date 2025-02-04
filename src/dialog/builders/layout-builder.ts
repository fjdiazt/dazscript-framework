import { Direction } from '@dsf/dialog/shared';
import { WidgetBuilderContext } from './widgets-builder';

export enum LayoutOrientation {
    LeftToRight = 0,
    RightToLeft = 1,
    TopToBottom = 2,
    BottomToTop = 3
}

export default class LayoutBuilder {
    private widgetParent: DzWidget | DzLayout | null;
    private _direction: Direction = 'vertical';
    private _orientation?: LayoutOrientation;

    constructor(protected context: WidgetBuilderContext) { }

    static create(context: WidgetBuilderContext): LayoutBuilder {
        return new LayoutBuilder(context)
    }

    orientation(orientation: LayoutOrientation): this {
        this._orientation = orientation;
        return this
    }

    direction(direction: Direction): this {
        this._direction = direction;
        return this;
    }

    parent(parent: DzWidget | DzLayout): this {
        this.widgetParent = parent;
        return this;
    }

    build(then?: (layout: DzVBoxLayout | DzHBoxLayout) => void): DzVBoxLayout | DzHBoxLayout {
        let parent = this.widgetParent ?? this.context.parent;
        let type = this.getLayoutFor(this._direction);
        let layout = new type(parent);
        if (this._orientation) layout.direction = this._orientation;

        let currentLayout = this.context.layout;
        this.context.layout = layout;

        if (parent.inherits("DzWidget") && (parent as any).addLayout)
            (parent as DzBasicDialog).addLayout(layout);

        then?.(layout);

        this.context.layout = currentLayout;
        return layout;
    }

    private getLayoutFor(direction: string): new (arg: any) => DzVBoxLayout | DzHBoxLayout {
        return direction === 'horizontal' ? DzHBoxLayout : DzVBoxLayout;
    }
}

