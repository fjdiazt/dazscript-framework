import { contains } from './string-helper'

let filterRunId = 0

export const clearColumns = (listView: DzListView) => {
    for (let i = 0; i < listView.columns; i++) {
        listView.removeColumn(i)
    }
}

export const setDataItem = (listItem: DzListViewItem, data: any) => {
    listItem.addDataItem('data', data)
}

export const getDataItem = <T>(listItem: DzListViewItem): T | null => {
    return (listItem?.getDataItem('data') ?? null) as T | null
}

export const filter = (listView: DzListView, filterOn: (viewItem: DzListViewItem) => string, keywords: string, options?: { selectOnFilter?: boolean, filters?: (viewItem: DzListViewItem) => boolean }) => {
    filterRunId++
    const currentRunId = filterRunId
    const visitKey = '__dsfFilterVisitId'

    listView.clearSelection()
    const normalizedKeywords = keywords?.toLowerCase() ?? ''
    const words = normalizedKeywords.split(" ")

    listView.getItems(DzListView.All).forEach(item => item.visible = true)

    const matchFilter = (text: string): boolean => {
        text = text.toLowerCase()

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

        if (options?.selectOnFilter === true && viewItem.visible && viewItem.childCount() === 0 && !listView.selectedItem()) {
            listView.setSelected(viewItem, true)
            listView.ensureItemVisible(viewItem)
        }

        return viewItem.visible;
    }

    const filterListViewItem = (viewItem: DzListViewItem): boolean => {
        if ((viewItem as any)[visitKey] === currentRunId) {
            return viewItem.visible
        }
        ; (viewItem as any)[visitKey] = currentRunId

        var visible = false;

        if (viewItem.childCount() > 0) {
            var child = viewItem.firstChild()
            while (child) {
                visible = visible || filterListViewItem(child)
                child = child.nextSibling()
            }
        }

        const selfVisible = setListViewItemVisibility(viewItem)
        viewItem.visible = viewItem.childCount() > 0
            ? visible
            : selfVisible
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
