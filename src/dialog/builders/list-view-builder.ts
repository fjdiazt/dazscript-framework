import { warn } from '@dsf/common/log';
import { clearColumns, filter, getDataItem, setDataItem } from '@dsf/helpers/list-view-helper';
import { Delayed } from '@dsf/lib/delayed';
import { Observable } from '@dsf/lib/observable';
import { TreeNode } from '@dsf/lib/tree-node';
import { IWidgetBuilder, createWidget } from './widget-builder';
import { WidgetBuilderContext } from './widgets-builder';

type ListViewFilterOptions = {
    keywords: Observable<string>,
    field: (listItem: DzListViewItem) => string,
    selectOnFilter?: boolean,
    filters?: (viewItem: DzListViewItem) => boolean
}

export enum ListViewRefreshOptions {
    All,
    Filters
}

export class ListViewBuilder<TItem, TData> implements IWidgetBuilder<DzListView> {

    private readonly context: ListViewBuilderContext<TItem, TData>

    constructor(dialogContext: WidgetBuilderContext) {
        this.context = new ListViewBuilderContext(dialogContext)
    }

    visible(value: boolean | Observable<boolean>): this {
        this.context.visible = typeof value === 'boolean'
            ? new Observable(value)
            : value
        return this
    }

    /**
     * Binds the list rows to a collection of items
     * @param items
     * @returns
     */
    items(items: Observable<TreeNode<TItem>[]>): ListViewBindBuilder<TItem, TData> {
        this.context.items = items
        return new ListViewBindBuilder(this.context)
    }

    /**
     * Build an item row with the provided function
     * @param build the function to use for building a row
     * @returns returns a ListViewItem or DzCheckListItem
     */
    row(build: (item: TreeNode<TItem>, parent: DzListView | DzListViewItem, id?: number) => DzListViewItem): this {
        this.context.rowBuilder = build
        return this
    }

    sorting(sort: boolean | number): this {
        if (typeof sort === 'boolean')
            this.context.sorting = sort ? 0 : -1
        else
            this.context.sorting = sort
        return this
    }

    expanded(onOff: boolean | Observable<boolean>): this {
        if (typeof onOff === 'boolean')
            this.context.expanded = new Observable(onOff)
        else
            this.context.expanded = onOff
        return this
    }

    flat(onOff: boolean | Observable<boolean>): this {
        this.context.flat = typeof onOff === 'boolean'
            ? new Observable(onOff)
            : onOff
        return this
    }

    doubleClicked(bind: Observable<TData>): this {
        this.context.doubleClicked = bind
        return this
    }

    refresh(when: Observable<any>, what: ListViewRefreshOptions = ListViewRefreshOptions.All): this {
        this.context.refreshWhen = when
        this.context.refreshWhat = what
        return this
    }

    contextMenu(fn: (listView: DzListView, item: DzListViewItem, pos: Point) => DzPopupMenu): this {
        this.context.contextMenu = fn
        return this
    }

    build(then?: (listView: DzListView) => void): DzListView {
        let listView = build(this.context)
        then?.(listView)
        return listView
    }
}

class ListViewBuilderContext<TItem, TData> {
    columns: Observable<string[]> = new Observable([])
    columnsWidth: (index: number, width: number) => number
    items: Observable<TreeNode<TItem>[]> = new Observable([])
    text: (item: TreeNode<TItem>) => string[]
    data: (item: TreeNode<TItem>) => TData
    sorting: number = 0
    selected: Observable<TData>
    filter: ListViewFilterOptions
    doubleClicked: Observable<TData>
    rowBuilder: (item: TreeNode<TItem>, parent: DzListView | DzListViewItem, id?: number) => DzListViewItem
    contextMenu: (listView: DzListView, item: DzListViewItem, pos: Point) => DzPopupMenu
    refreshWhen: Observable<void>
    expanded: Observable<boolean>
    visible: Observable<boolean> = new Observable(true)
    decorated: boolean
    flat: Observable<boolean>
    refreshWhat: ListViewRefreshOptions = ListViewRefreshOptions.All
    constructor(public readonly dialogContext: WidgetBuilderContext) { }
}

class ListViewBindBuilder<TItem, TData> {
    constructor(private context: ListViewBuilderContext<TItem, TData>) { }

    /**
    * Sepecify the text to display on each column
    * @param columns
    * @returns
    */
    columns(columns: string[] | Observable<string[]>, width?: (index: number, width: number) => number): this {
        this.context.columns = columns instanceof Observable
            ? columns
            : new Observable(columns)
        this.context.columnsWidth = width
        return this
    }

    /**
     * Callback for extracting the text to display on each column from every item in the list
     * @param from the callback function to extract the text for each item
     * @returns a string array for every column text to be display for a given item
     */
    text(from: (item: TreeNode<TItem>) => string[]): this {
        this.context.text = from
        return this
    }

    /**
     * Callback to specify which part of the item will be stored in each row as data. It can be
     * the whole item or a property of the item
     * @param from the callback function to specify what to store as data
     * @returns the data to be stored in each row for a given item
     */
    data(from: (item: TreeNode<TItem>) => TData): this {
        this.context.data = from
        return this
    }

    /**
     * Bind the data of a selected row in the list to an object
     * @param bind
     * @returns
     */
    selected(bind: Observable<TData>): this {
        this.context.selected = bind
        return this
    }

    filter(options: ListViewFilterOptions): this {
        this.context.filter = options
        return this
    }

    build(then?: (listView: DzListView) => void): DzListView {
        let listView = build(this.context)
        then?.(listView)
        return listView
    }
}

const build = <TItem, TData>(context: ListViewBuilderContext<TItem, TData>): DzListView => {
    const listView = createWidget(context.dialogContext).build(DzListView)
    let rowId = -1

    if (context.visible) {
        if (context.visible.value === false)
            listView.hide()
        context.visible.connect((visible) => {
            if (visible)
                listView.show()
            else
                listView.hide()
        })
    }

    const buildColumns = (columns: string[]) => {
        clearColumns(listView)
        columns.forEach(column => {
            listView.addColumn(column)
        })
    }

    const buildItem = (item: TreeNode<TItem>, parent: DzListView | DzListViewItem) => {
        rowId++
        parent = context.flat?.value === true ? listView : parent

        let listItem = context.rowBuilder ? context.rowBuilder(item, parent, rowId) : new DzListViewItem(parent, rowId)
        if (!listItem) return

        listItem.open = context.expanded?.value === true

        context.text(item).forEach((text, idx) => {
            let data = context.data?.(item)
            if (data) {
                setDataItem(listItem, data)
            }
            if (!text || idx >= context.columns.value.length)
                return;
            listItem.setText(idx, text)
        })

        item.children.forEach((child) => {
            context.decorated = true
            buildItem(child, listItem)
        })
    }

    const filterList = (keywords?: string) => {
        filter(listView, context.filter.field, keywords ?? context.filter?.keywords?.value, { selectOnFilter: context.filter.selectOnFilter ?? true, filters: context.filter.filters })
    }

    const buildList = (items: TreeNode<TItem>[], selectedId?: number) => {
        rowId = -1
        if (!context.text)
            return warn('No text function provided for list builder')

        listView.clear()
        context.columns?.value.forEach((_, index) => {
            listView.setColumnWidth(index, 0)
        })
        listView.allColumnsShowFocus = true

        if (context.visible.value === false)
            return

        if (!items) return

        items.forEach((item) => {
            buildItem(item, listView)
        })

        if (context.columnsWidth) {
            context.columns?.value.forEach((_, index) => {
                listView.setColumnWidth(index, context.columnsWidth(index, listView.columnWidth(index)))
            })
        }

        listView.rootIsDecorated = context.decorated
        listView.setSorting(context.sorting)
        if (context.sorting >= 0) listView.sort()

        if (context.filter?.keywords.value || context.filter?.filters)
            filterList()

        if (selectedId) {
            listView.getItems(DzListView.All).forEach(item => {
                if (item.id === selectedId) {
                    listView.setSelected(item, true)
                    listView.setCurrentItem(item)
                    listView.ensureItemVisible(item)
                }
            })
        }
    }

    const onSelectionChanged = (callback: (item: DzListViewItem, data: TData) => void) => {
        (listView as any)["selectionChanged()"].scriptConnect(() => {
            callback(listView.selectedItem(), getDataItem(listView.selectedItem()))
        })
    }

    buildColumns(context.columns.value)
    context.columns.connect((columns) => {
        buildColumns(columns)
    })

    buildList(context.items?.value)
    context.items.connect((items) => {
        buildList(items, listView.selectedItem()?.id)
    })

    context.refreshWhen?.connect(() => {
        if (context.refreshWhat === ListViewRefreshOptions.All)
            buildList(context.items?.value, listView.selectedItem()?.id)
        else {
            filterList()
        }

    })

    if (context.selected) {
        onSelectionChanged((_, data) => {
            context.selected.value = data
        })
    }

    if (context.filter) {
        context.filter.keywords.connect((keywords) => {
            new Delayed(() => {
                filterList(keywords)
            }, 100, 400).trigger()
        })
    }

    if (context.doubleClicked) {
        listView.doubleClicked.scriptConnect((listItem) => {
            context.doubleClicked.value = listItem?.getDataItem('data')
        })
    }

    listView.contextMenuRequested.scriptConnect((item: DzListViewItem, pos: Point) => {
        context.contextMenu?.(listView, item, pos).exec(pos.cursorPos(), 0)
    })

    return listView
}