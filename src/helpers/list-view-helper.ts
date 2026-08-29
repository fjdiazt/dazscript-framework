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

type SearchTerm = { value: string, exact: boolean }

const isWordCharacter = (character: string): boolean => {
    const code = character?.charCodeAt(0) ?? 0
    return code >= 48 && code <= 57 || code >= 97 && code <= 122 || character === '_'
}

const containsBounded = (text: string, phrase: string): boolean => {
    let index = text.indexOf(phrase)
    while (index >= 0) {
        const startsAtBoundary = !isWordCharacter(phrase.charAt(0)) || !isWordCharacter(text.charAt(index - 1))
        const endsAtBoundary = !isWordCharacter(phrase.charAt(phrase.length - 1)) || !isWordCharacter(text.charAt(index + phrase.length))
        if (startsAtBoundary && endsAtBoundary) return true
        index = text.indexOf(phrase, index + 1)
    }
    return false
}

const parseSearchTerms = (keywords: string): SearchTerm[] => {
    const terms: SearchTerm[] = []
    const pattern = /"((?:""|[^"])*)"|(\S+)/g
    let match: RegExpExecArray | null
    while ((match = pattern.exec(keywords)) !== null) {
        const quoted = match[1]
        terms.push(quoted
            ? { value: quoted.replace(/""/g, '"'), exact: true }
            : { value: match[0], exact: false })
    }
    return terms
}

export const createSearchMatcher = (keywords: string): ((text: string) => boolean) => {
    const normalizedKeywords = keywords?.toLowerCase() ?? ''
    if (!normalizedKeywords.trim()) return () => true

    if (normalizedKeywords.indexOf('"') < 0) {
        const words = normalizedKeywords.split(' ').filter(Boolean)
        return (text) => {
            const normalizedText = text.toLowerCase()
            return words.every(word => normalizedText.indexOf(word) >= 0)
        }
    }

    const terms = parseSearchTerms(normalizedKeywords)
    return (text) => {
        const normalizedText = text.toLowerCase()
        return terms.every(term => term.exact
            ? containsBounded(normalizedText, term.value)
            : normalizedText.indexOf(term.value) >= 0)
    }
}

export const filter = (listView: DzListView, filterOn: (viewItem: DzListViewItem) => string, keywords: string, options?: { selectOnFilter?: boolean, filters?: (viewItem: DzListViewItem) => boolean }) => {
    filterRunId++
    const currentRunId = filterRunId
    const visitKey = '__dsfFilterVisitId'

    listView.clearSelection()
    const matchFilter = createSearchMatcher(keywords)

    listView.getItems(DzListView.All).forEach(item => item.visible = true)

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
