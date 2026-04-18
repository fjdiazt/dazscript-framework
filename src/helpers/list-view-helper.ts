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
    const normalizedKeywords = keywords?.toLowerCase() ?? ''
    const words = normalizedKeywords.split(' ').filter(word => word.length > 0)

    const matchFilter = (normalizedText: string): boolean => {
        if (!keywords || keywords.trim() == "") return true

        return words.every(word => {
            return contains(normalizedText, word)
        })
    }

    const getNormalizedText = (viewItem: DzListViewItem): string => {
        const cacheKey = '__dsfNormalizedFilterText'
        const rawText = filterOn(viewItem) ?? ''
        const cached = (viewItem as any)[cacheKey] as { raw: string, normalized: string } | undefined

        if (cached && cached.raw === rawText) return cached.normalized

        const normalized = rawText.toLowerCase()
        ; (viewItem as any)[cacheKey] = { raw: rawText, normalized }
        return normalized
    }

    const setListViewItemVisibility = (viewItem: DzListViewItem): boolean => {
        let keywordMatch = matchFilter(getNormalizedText(viewItem))
        let filtersMatch = !options?.filters || options.filters?.(viewItem) === true
        viewItem.visible = keywordMatch && filtersMatch

        if (options?.selectOnFilter === true && viewItem.visible && !listView.selectedItem()) {
            listView.setSelected(viewItem, true)
            listView.ensureItemVisible(viewItem)
        }

        return viewItem.visible;
    }

    const roots = listView.getItems(DzListView.All).filter(viewItem => !viewItem.parent())

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

    roots.forEach(viewItem => {
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
