import { Observable } from '@dsf/lib/observable'
import { ButtonBuilder } from './button-builder'
import CheckBoxBuilder from './checkbox-builder'
import { ComboBoxBuilder } from './combo-box-builder'
import { ComboEditBuilder } from './combo-edit-builder'
import GroupBoxBuilder from './groupbox-builder'
import LabelBuilder from './label-builder'
import LayoutBuilder, { LayoutOrientation } from './layout-builder'
import LineEditBuilder from './line-edit-builder'
import { ListViewBuilder } from './list-view-builder'
import { NodeSelectionComboBoxBuilder } from './node-selection-builder'
import { PopupMenuBuilder } from './popup-menu-builder'
import RadioButtonBuilder from './radio-builder'
import { SplitterBuilder, SplitterBuilderContext } from './splitter-builder'
import { TabBuilder, TabBuilderContext } from './tab-builder'
import { createWidget } from './widget-builder'

export class WidgetBuilderContext {
    layout: DzLayout | null

    get parent(): DzWidget | DzLayout {
        return this.layout ?? this.dialog
    }

    constructor(public readonly dialog: DzBasicDialog) {
        this.layout = new LayoutBuilder(this).build()
    }
}

export class WidgetsBuilder {
    private readonly tabsContext: TabBuilderContext
    private readonly splitterContext: SplitterBuilderContext

    constructor(public readonly context: WidgetBuilderContext) {
        this.tabsContext = new TabBuilderContext(this.context)
        this.splitterContext = new SplitterBuilderContext(this.context)
    }

    vertical(then: (layout: DzVBoxLayout) => void, orientation: LayoutOrientation = LayoutOrientation.LeftToRight): DzVBoxLayout {
        return LayoutBuilder
            .create(this.context)
            .orientation(orientation)
            .direction('vertical')
            .build(then)
    }

    horizontal(then: (layout: DzHBoxLayout) => void, orientation: LayoutOrientation = LayoutOrientation.LeftToRight): DzHBoxLayout {
        return LayoutBuilder
            .create(this.context)
            .orientation(orientation)
            .direction('horizontal')
            .build(then)
    }

    widget<T extends DzWidget>(type: { new(p0: any, p1?: any, p2?: any, p3?: any): T }, then?: (widget: T) => void): T {
        return createWidget(this.context).build(type, then)
    }

    label(text: string): LabelBuilder {
        return new LabelBuilder(this.context).text(text)
    }

    button(text?: string): ButtonBuilder {
        return new ButtonBuilder(this.context).text(text)
    }

    edit(): LineEditBuilder {
        return new LineEditBuilder(this.context)
    }

    checkbox(label?: string): CheckBoxBuilder {
        return new CheckBoxBuilder(this.context).label(label)
    }

    radio(label?: string): RadioButtonBuilder {
        return new RadioButtonBuilder(this.context).label(label)
    }

    group(title?: string | Observable<string>): GroupBoxBuilder {
        return new GroupBoxBuilder(this.context).title(title)
    }

    tab(title?: string): TabBuilder {
        return TabBuilder.create(this.tabsContext).title(title)
    }

    splitter(...items: DzWidget[]): SplitterBuilder {
        return new SplitterBuilder(this.splitterContext).items(...items)
    }

    contextMenu(): PopupMenuBuilder {
        return new PopupMenuBuilder(this.context)
    }

    combo(): ComboBoxBuilder {
        return new ComboBoxBuilder(this.context)
    }

    comboEdit(): ComboEditBuilder {
        return new ComboEditBuilder(this.context)
    }

    // pathComboBox(checkBoxes: boolean = false): PathComboBoxBuilder {
    //     return new PathComboBoxBuilder(this.context, checkBoxes)
    // }

    /**
     *
     * @returns
     * @deprecated use list
     */
    listView<TItem, TData = TItem>(): ListViewBuilder<TItem, TData> {
        return new ListViewBuilder(this.context)
    }

    get list(): { view: <TItem, TData = TItem>() => ListViewBuilder<TItem, TData> } {
        return {
            view: <TItem, TData = TItem>() => new ListViewBuilder<TItem, TData>(this.context)
        }
    }

    nodeSelection(): NodeSelectionComboBoxBuilder {
        return new NodeSelectionComboBoxBuilder(this.context)
    }
}
