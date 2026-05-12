import { describe, expect, it } from 'vitest'
import { getCanonicalInstallerEntry, toActionKey } from './custom-action-installer-entries'

const entries = [
    { action: { text: 'Power Menu - Main Actions', filePath: './Power Menu Actions.dsa' }, effectiveShortcut: '' },
    { action: { text: 'Power Menu', filePath: './Power Menu.dsa' }, effectiveShortcut: '' },
]

describe('setup installer entries', () => {
    it('builds an empty key for missing action data instead of throwing', () => {
        expect(toActionKey(undefined)).toBe('')
    })

    it('resolves row data back to the canonical installer entry', () => {
        const rowCopy = {
            action: { text: 'Power Menu', filePath: './Power Menu.dsa' },
            effectiveShortcut: 'F12'
        }

        const canonical = getCanonicalInstallerEntry(entries, rowCopy)

        expect(canonical).toBe(entries[1])
    })

    it('falls back to the displayed action text when row data is not an installer entry', () => {
        const canonical = getCanonicalInstallerEntry(entries, { value: null }, 'Power Menu')

        expect(canonical).toBe(entries[1])
    })

    it('ignores row data with an invalid action property before falling back to displayed text', () => {
        const canonical = getCanonicalInstallerEntry(entries, { action: true }, 'Power Menu')

        expect(canonical).toBe(entries[1])
    })

    it('prefers displayed row text over attached row data', () => {
        const staleRowData = {
            action: { text: 'Power Menu - Main Actions', filePath: './Power Menu Actions.dsa' },
            effectiveShortcut: ''
        }

        const canonical = getCanonicalInstallerEntry(entries, staleRowData, 'Power Menu')

        expect(canonical).toBe(entries[1])
    })

    it('returns null when neither row data nor displayed text identify an installer entry', () => {
        const canonical = getCanonicalInstallerEntry(entries, { action: true }, 'Missing')

        expect(canonical).toBeNull()
    })
})
