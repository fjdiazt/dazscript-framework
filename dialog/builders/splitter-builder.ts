import { debug } from '@dsf/common/log';
import { WidgetBuilderBase, createWidget } from './widget-builder';
import { WidgetBuilderContext } from './widgets-builder';
import { Observable } from '@dsf/lib/observable';
import { getState, restoreState } from '@dsf/helpers/splitter-helper';

export class SplitterBuilder extends WidgetBuilderBase<DzSplitter> {
    private _items: DzWidget[] = []

    constructor(private context: SplitterBuilderContext) {
        super(createWidget(context.widgetContext).build(DzSplitter))
    }

    vertical(): this {
        this.context.orientation = DzSplitter.Vertical
        return this
    }

    horizontal(): this {
        this.context.orientation = DzSplitter.Horizontal
        return this
    }

    items(...items: DzWidget[]): this {
        this._items = items
        return this
    }

    collapsible(...collapsible: boolean[]): this {
        this.context.collapsible = collapsible
        return this
    }

    strech(...strech: number[]): this {
        this.context.strech = strech
        return this
    }

    state(bind: Observable<string>): this {
        this.context.state = bind
        return this
    }

    build(then?: (splitter: DzSplitter) => void): DzSplitter {
        let splitter = createWidget(this.context.widgetContext).build(DzSplitter)
        splitter.orientation = this.context.orientation

        this._items?.forEach((widget, index) => {
            splitter.addWidget(widget)
            splitter.setCollapsible(index, this.context.collapsible[index] ?? this.context.collapsible[0] ?? false)
            splitter.setStretchFactor(index, this.context.strech[index] ?? this.context.strech[0] ?? 0)
        })

        restoreState(splitter, this.context.state?.value);
        (splitter.getWidget() as QSplitter).splitterMoved.scriptConnect(() => {
            this.context.state.value = getState(splitter)
        })
        this.context.state.connect((state) => {
            restoreState(splitter, state)
        })

        this.context.add(splitter, (splitter) => {
            then?.(splitter)
        })

        return splitter
    }
}

export class SplitterBuilderContext {
    private _current: DzSplitter

    orientation: number = DzSplitter.Vertical
    collapsible: boolean[] = []
    strech: number[] = []
    state = new Observable<string>()

    get current(): DzSplitter | null {
        return this._current
    }

    constructor(public readonly widgetContext: WidgetBuilderContext) { }

    add(splitter: DzSplitter, content: (splitterWidget: DzSplitter) => void): DzSplitter {
        this._current = splitter
        content(splitter)
        this._current = null
        return splitter
    }
}