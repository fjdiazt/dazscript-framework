import { contains } from './string-helper'

export const clearColumns = (listView: DzListView) => {
    for (let i = 0; i < listView.columns; i++) {
        listView.removeColumn(i)
    }
}

export const setDataItem = (listItem: DzListViewItem, data: any) => {
    listItem.addDataItem('data', data)
}

export const getDataItem = <T>(listItem: DzListViewItem): T | null => {
    return listItem?.getDataItem('data') ?? null
}

export const filter = (listView: DzListView, filterOn: (viewItem: DzListViewItem) => string, keywords: string, options?: { selectOnFilter?: boolean, filters?: (viewItem: DzListViewItem) => boolean }) => {
    listView.clearSelection()
    listView.getItems(DzListView.All).forEach(item => item.visible = true)

    const matchFilter = (text: string): boolean => {
        text = text.toLowerCase()
        var words = keywords?.toLowerCase().split(" ") ?? []

        return !keywords || keywords.trim() == "" ||
            words.every(w => {
                return w.length >= 1 || !isNaN(Number(w))
                    ? contains(text, w)
                    : text.startsWith(w)
            });
    }

    const setListViewItemVisibility = (viewItem: DzListViewItem): boolean => {
        let keywordMatch = matchFilter(filterOn(viewItem))
        let filtersMatch = !options?.filters || options.filters?.(viewItem) === true
        viewItem.visible = keywordMatch && filtersMatch

        if (options?.selectOnFilter === true && viewItem.visible && !listView.selectedItem()) {
            listView.setSelected(viewItem, true)
            listView.ensureItemVisible(viewItem)
        }

        return viewItem.visible;
    }

    const filterListViewItem = (viewItem: DzListViewItem): boolean => {
        var visible = false;

        if (viewItem.childCount() > 0) {
            var child = viewItem.firstChild()
            while (child) {
                visible = visible || filterListViewItem(child)
                child = child.nextSibling()
            }
        }

        viewItem.visible = visible || setListViewItemVisibility(viewItem);
        return viewItem.visible;
    }

    listView.getItems(DzListView.All).forEach(viewItem => {
        viewItem.visible = true
        filterListViewItem(viewItem)
    });
}

export const expand = (listView: DzListView, expandOrCollapse: boolean, listItem?: DzListViewItem) => {
    if (listItem) {
        listItem.open = expandOrCollapse
        if (listItem.childCount() > 0) {
            var child = listItem.firstChild()
            while (child) {
                expand(listView, expandOrCollapse, child)
                child = child.nextSibling()
            }
        }
    }
    else {
        listView.getItems(DzListView.All).forEach((item) => {
            item.open = expandOrCollapse
        })
    }
}

export const checkAll = (listView: DzListView, onOff: boolean) => {
    listView.getItems(onOff ? DzListView.NotChecked : DzListView.Checked).forEach(item => {
        (item as DzCheckListItem).on = onOff
    })
}