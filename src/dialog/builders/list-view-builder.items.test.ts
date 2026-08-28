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
    getWidget: vi.fn(() => focusWidget),
    selectedItem: vi.fn(() => null),
    doubleClicked: { scriptConnect: vi.fn() },
    contextMenuRequested: { scriptConnect: vi.fn() }
}))

const focusWidget = vi.hoisted(() => ({ focusPolicy: 15 }))

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
    visible = true
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
vi.stubGlobal('QtFocusPolicy', { NoFocus: 0 })

import { filter } from '@dsf/helpers/list-view-helper'
import { ListViewBuilder, ListViewRefreshOptions } from './list-view-builder'

describe('ListViewBuilder item updates', () => {
    beforeEach(() => {
        listView.items = []
        vi.clearAllMocks()
        vi.mocked(filter).mockReset()
        focusWidget.focusPolicy = 15
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

    it('removes empty lists from tab focus and restores populated lists', () => {
        const items = new Observable<TreeNode<any>[]>([])

        new ListViewBuilder<any, any>({ dialog: {}, layout: null } as any)
            .tabFocusWhenPopulated()
            .items(items)
            .rebuildOnItemsChanged()
            .columns(['Name'])
            .text(item => [item.name])
            .data(item => item.value)
            .build()

        expect(focusWidget.focusPolicy).toBe(0)

        items.value = [new TreeNode('Action A', '', { name: 'ActionA' })]
        expect(focusWidget.focusPolicy).toBe(15)

        items.value = []
        expect(focusWidget.focusPolicy).toBe(0)
    })

    it('removes fully filtered lists from tab focus', () => {
        const refresh = new Observable<void>()

        new ListViewBuilder<any, any>({ dialog: {}, layout: null } as any)
            .tabFocusWhenPopulated()
            .refresh(refresh, ListViewRefreshOptions.Filters)
            .items(new Observable([new TreeNode('Action A', '', { name: 'ActionA' })]))
            .filter({ keywords: new Observable(''), field: item => item.textByColumn[0] })
            .columns(['Name'])
            .text(item => [item.name])
            .data(item => item.value)
            .build()

        vi.mocked(filter).mockImplementation((view: any) => {
            view.items.forEach((item: any) => item.visible = false)
        })
        refresh.trigger()

        expect(focusWidget.focusPolicy).toBe(0)
    })
})
