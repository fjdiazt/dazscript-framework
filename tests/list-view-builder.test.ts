import { describe, expect, it, vi } from 'vitest'
import { createFilterScheduler } from '@dsf/dialog/builders/list-view-filter-scheduler'

describe('createFilterScheduler', () => {
    it('reuses a single Delayed instance across keyword changes', () => {
        const trigger = vi.fn()
        const delayedFactory = vi.fn(() => ({ trigger }))
        const scheduleFilter = createFilterScheduler(() => { }, delayedFactory)

        scheduleFilter()
        scheduleFilter()
        scheduleFilter()

        expect(delayedFactory).toHaveBeenCalledTimes(1)
        expect(trigger).toHaveBeenCalledTimes(3)
    })
})
