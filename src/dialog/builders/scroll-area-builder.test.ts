import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Observable } from '@dsf/lib/observable'

const area = vi.hoisted(() => ({
    alignment: 0,
    minHeight: 0,
    maxHeight: 0,
    widgetResizable: true,
    hideFrame: vi.fn(),
    hide: vi.fn(),
    show: vi.fn(),
    setVerticalScrollbarDisplay: vi.fn(),
    setWidget: vi.fn()
}))

const layoutState = vi.hoisted(() => ({ direction: '', parent: null as any }))

vi.mock('./widget-builder', async (importOriginal) => ({
    ...await importOriginal<typeof import('./widget-builder')>(),
    createWidget: () => ({ build: () => area })
}))

vi.mock('./layout-builder', () => ({
    LayoutOrientation: { LeftToRight: 0 },
    default: class {
        parent(value: any) { layoutState.parent = value; return this }
        direction(value: string) { layoutState.direction = value; return this }
        build(then?: (layout: any) => void) {
            const layout = { margin: -1, spacing: -1 }
            then?.(layout)
            return layout
        }
    }
}))

class FakeWidget {
    fixedSize: [number, number] | null = null
    constructor(public parent: any) { }
    getWidget() { return { minimumSizeHint: { width: 420, height: 60 } } }
    setFixedSize(width: number, height: number) { this.fixedSize = [width, height] }
}

vi.stubGlobal('DzScrollArea', class { })
vi.stubGlobal('DzWidget', FakeWidget)
vi.stubGlobal('DzSplitter', { Vertical: 1 })

import { WidgetsBuilder } from './widgets-builder'

describe('ScrollAreaBuilder', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        area.alignment = 0
        area.minHeight = 0
        area.maxHeight = 0
        area.widgetResizable = true
        layoutState.direction = ''
        layoutState.parent = null
    })

    it('builds flat horizontal scrollable content with bound visibility', () => {
        const visible = new Observable(false)
        const add = new WidgetsBuilder({ dialog: {}, layout: {} } as any)
        let callbackArea: any

        const built = add.scroll()
            .horizontal()
            .flat()
            .alignment(34)
            .visible(visible)
            .build((layout, scrollArea) => {
                layout.margin = 0
                layout.spacing = 5
                callbackArea = scrollArea
            })

        expect(built).toBe(area)
        expect(callbackArea).toBe(area)
        expect(area.hideFrame).toHaveBeenCalledOnce()
        expect(area.widgetResizable).toBe(false)
        expect(area.alignment).toBe(34)
        expect(area.setVerticalScrollbarDisplay).toHaveBeenCalledWith(false)
        expect(layoutState.direction).toBe('horizontal')
        expect(layoutState.parent.fixedSize).toEqual([420, 60])
        expect([area.minHeight, area.maxHeight]).toEqual([80, 80])
        expect(area.hide).toHaveBeenCalledOnce()

        visible.value = true
        expect(area.show).toHaveBeenCalledOnce()
    })
})
