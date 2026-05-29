import { describe, expect, it } from 'vitest'
import { SETUP_BULK_ACTIONS, applySetupBulkSelection } from './custom-action-installer-bulk'

describe('setup bulk actions', () => {
    it('uses concise install and uninstall labels', () => {
        expect(SETUP_BULK_ACTIONS.installAll.label).toBe('Install All')
        expect(SETUP_BULK_ACTIONS.uninstallAll.label).toBe('Uninstall All')
    })

    it('selects every installer entry for install all', () => {
        const entries = [
            { selected: false },
            { selected: true },
            { selected: false }
        ]

        applySetupBulkSelection(entries, true)

        expect(entries.map(entry => entry.selected)).toEqual([true, true, true])
    })

    it('deselects every installer entry for uninstall all', () => {
        const entries = [
            { selected: true },
            { selected: false },
            { selected: true }
        ]

        applySetupBulkSelection(entries, false)

        expect(entries.map(entry => entry.selected)).toEqual([false, false, false])
    })
})
