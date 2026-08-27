import { beforeEach, describe, expect, it, vi } from 'vitest'

const actionPixmap = vi.hoisted(() => vi.fn())

vi.mock('@dsf/common/log', () => ({ debug: vi.fn(), warn: vi.fn() }))
vi.mock('@dsf/core/global', () => ({
    mainWindow: { getActionMgr: () => ({}) }
}))

import { getActionPixmap } from './action-helper'

describe('getActionPixmap', () => {
    beforeEach(() => {
        actionPixmap.mockReset()
        vi.stubGlobal('App', {
            getStyle: () => ({ actionPixmap })
        })
    })

    it('rejects a null pixmap even when DAZ reports nonzero height', () => {
        actionPixmap.mockReturnValue({
            height: 16,
            isNull: () => true
        })

        expect(getActionPixmap('DzTestAction', '')).toBeNull()
    })
})
