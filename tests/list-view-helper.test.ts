import { describe, expect, it } from 'vitest'
import { filter } from '@dsf/helpers/list-view-helper'

(globalThis as any).DzListView = { All: 4 }

class TestListViewItem {
    visible = true
    open = false
    private readonly children: TestListViewItem[] = []
    private parentItem?: TestListViewItem

    constructor(
        public readonly id: number,
        public label: string
    ) { }

    append(child: TestListViewItem): TestListViewItem {
        child.parentItem = this
        this.children.push(child)
        return child
    }

    childCount(): number {
        return this.children.length
    }

    firstChild(): TestListViewItem | null {
        return this.children[0] ?? null
    }

    nextSibling(): TestListViewItem | null {
        if (!this.parentItem) return null

        const index = this.parentItem.children.indexOf(this)
        return this.parentItem.children[index + 1] ?? null
    }

    parent(): TestListViewItem | null {
        return this.parentItem ?? null
    }
}

class TestListView {
    static All = 4

    private readonly selected: TestListViewItem[] = []

    constructor(private readonly items: TestListViewItem[]) { }

    clearSelection(): void {
        this.selected.length = 0
    }

    getItems(_: number): TestListViewItem[] {
        return this.items
    }

    selectedItem(): TestListViewItem | null {
        return this.selected[0] ?? null
    }

    setSelected(item: TestListViewItem, onOff: boolean): void {
        if (!onOff) return
        if (this.selected.indexOf(item) === -1) this.selected.push(item)
    }

    ensureItemVisible(_: TestListViewItem): void { }
}

const flatten = (...items: TestListViewItem[]): TestListViewItem[] => {
    const result: TestListViewItem[] = []

    const walk = (item: TestListViewItem) => {
        result.push(item)

        let child = item.firstChild()
        while (child) {
            walk(child)
            child = child.nextSibling()
        }
    }

    items.forEach(walk)
    return result
}

describe('filter', () => {
    it('evaluates each item once even when getItems(All) returns the full flattened tree', () => {
        const parent = new TestListViewItem(1, 'Parent')
        const child = parent.append(new TestListViewItem(2, 'Child match'))
        const grandChild = child.append(new TestListViewItem(3, 'Grandchild'))
        const listView = new TestListView(flatten(parent))
        const seen: number[] = []

        filter(
            listView as unknown as DzListView,
            (item) => {
                seen.push((item as unknown as TestListViewItem).id)
                return (item as unknown as TestListViewItem).label
            },
            'missing'
        )

        expect(seen).toEqual([3, 2, 1])
        expect(parent.visible).toBe(false)
        expect(child.visible).toBe(false)
        expect(grandChild.visible).toBe(false)
    })

    it('keeps ancestors visible when a descendant matches', () => {
        const parent = new TestListViewItem(1, 'Parent')
        parent.append(new TestListViewItem(2, 'Nested match'))
        const listView = new TestListView(flatten(parent))

        filter(listView as unknown as DzListView, item => (item as unknown as TestListViewItem).label, 'nested')

        expect(parent.visible).toBe(true)
    })

    it('selects only the first visible match during filtering', () => {
        const first = new TestListViewItem(1, 'Alpha match')
        const second = new TestListViewItem(2, 'Beta match')
        const listView = new TestListView([first, second])

        filter(listView as unknown as DzListView, item => (item as unknown as TestListViewItem).label, 'match', { selectOnFilter: true })

        expect(listView.selectedItem()).toBe(first)
    })
})
