import { Observable } from '@dsf/lib/observable';
import { Direction } from '../shared';
import LayoutBuilder from './layout-builder';
import { IWidgetBuilder } from './widget-builder';
import { WidgetBuilderContext } from './widgets-builder';

export class TabBuilder implements IWidgetBuilder<DzTabWidget> {
    private direction: Direction = 'vertical';
    private titleText: string;
    private tabIndex_: Observable<number>;
    private currentChanged: (index: number) => void;

    constructor(private layoutBuilder: LayoutBuilder, private context: TabBuilderContext) {
    }

    visible(value: boolean | Observable<boolean>): this {
        this.context.visible = typeof value === 'boolean'
            ? new Observable(value)
            : value
        return this
    }

    static create(context: TabBuilderContext): TabBuilder {
        return new TabBuilder(new LayoutBuilder(context.widgetContext), context)
    }

    horizontal(): this {
        this.direction = 'horizontal'
        return this
    }

    vertical(): this {
        this.direction = 'vertical'
        return this
    }

    title(text: string): this {
        this.titleText = text;
        return this;
    }

    bind(tabNumber: Observable<number>): this {
        this.tabIndex_ = tabNumber;
        return this;
    }

    onChanged(then: (index: number) => void): this {
        this.currentChanged = then
        return this
    }

    build(then?: (layout: DzVBoxLayout | DzHBoxLayout, tabWidget: DzTabWidget) => void): DzTabWidget {
        return this.context.add((tabWidget) => {
            let tab = new DzWidget(this.context.widgetContext.dialog)
            tabWidget.addTab(tab, this.titleText)
            this.context.widgetContext.layout.addWidget(tabWidget)

            this.layoutBuilder
                .parent(tab)
                .direction(this.direction)
                .build((layout) => {
                    then?.(layout, tabWidget)
                })

            if (this.context.visible) {
                if (this.context.visible.value === false)
                    tab.hide()
                this.context.visible.connect((visible) => {
                    if (visible)
                        tab.show()
                    else
                        tab.hide()
                })
            }

            tabWidget["currentChanged(int)"].scriptConnect((index: number) => {
                if (this.tabIndex_) this.tabIndex_.value = index
                this.currentChanged?.(index)
            })

            tabWidget.setCurrentPage(this.tabIndex_?.value ?? 0)
        });
    }
}

export class TabBuilderContext {
    private counter = 1;
    private widgets: DzTabWidget[] = [];
    visible: Observable<boolean>

    constructor(public readonly widgetContext: WidgetBuilderContext) { }

    add(content: (tabWidget: DzTabWidget) => void): DzTabWidget {
        this.counter++
        let tabWidget = this.getWidget()
        content(tabWidget)
        this.counter--
        return tabWidget
    }

    private getWidget(): DzTabWidget {
        if (this.widgets.length === 0 || this.counter >= this.widgets.length)
            this.widgets[this.counter] = new DzTabWidget(this.widgetContext.dialog);
        return this.widgets[this.counter];
    }
}
