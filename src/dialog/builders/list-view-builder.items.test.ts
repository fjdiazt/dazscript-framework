import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Observable } from '@dsf/lib/observable'
import { TreeNode } from '@dsf/lib/tree-node'

const listView = vi.hoisted(() => ({
    items: [] as any[],
    addColumn: vi.fn(),
    clear: vi.fn(function (this: any) { this.items = [] }),
    columnWidth: vi.fn(() => 100),
    setColumnWidth: vi.fn(),
    getItems: vi.fn(function (this: any) { return this.items.slice() }),
    deleteItem: vi.fn(function (this: any, item: any) {
        this.items = this.items.filter((candidate: any) => candidate !== item)
    }),
    setSorting: vi.fn(),
    hide: vi.fn(),
    show: vi.fn(),
    selectedItem: vi.fn(() => null),
    doubleClicked: { scriptConnect: vi.fn() },
    contextMenuRequested: { scriptConnect: vi.fn() }
}))

vi.mock('./widget-builder', () => ({
    createWidget: () => ({ build: () => listView })
}))

vi.mock('@dsf/helpers/list-view-helper', () => ({
    clearColumns: vi.fn(),
    filter: vi.fn(),
    getDataItem: (item: any) => item?.data,
    setDataItem: (item: any, data: any) => item.data = data
}))

class FakeListViewItem {
    data: any
    open = false
    selectable = true
    textByColumn: Record<number, string> = {}

    constructor(parent: any, public id: number) {
        parent.items.push(this)
    }

    setText(column: number, text: string) {
        this.textByColumn[column] = text
    }
}

vi.stubGlobal('DzListView', { All: 0, Extended: 1 })
vi.stubGlobal('DzListViewItem', FakeListViewItem)

import { ListViewBuilder } from './list-view-builder'

describe('ListViewBuilder item updates', () => {
    beforeEach(() => {
        listView.items = []
        vi.clearAllMocks()
    })

    it('keeps unchanged rows when data has no explicit id', () => {
        const items = new Observable([
            new TreeNode('Action A', '', { name: 'ActionA' }),
            new TreeNode('Action B', '', { name: 'ActionB' })
        ])
        const builder = new ListViewBuilder<any, any>({ dialog: {}, layout: null } as any)

        builder
            .items(items)
            .columns(['Name'])
            .text(item => [item.name])
            .data(item => item.value)
            .build()

        items.value = [new TreeNode('Action B', '', { name: 'ActionB' })]

        expect(listView.items.map(item => item.textByColumn[0])).toEqual(['Action B'])
    })
})
