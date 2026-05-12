import { describe, expect, it } from 'vitest'
import {
    canResetSetupShortcut,
    getDisplayedSetupShortcut,
    resetSetupShortcut,
    setSetupShortcut,
    updateShortcutOverrideState
} from './custom-action-installer-shortcuts'

const shortcutState = (overrides: Partial<ReturnType<typeof baseState>> = {}) => ({
    ...baseState(),
    ...overrides
})

const baseState = () => ({
    installedActionName: '',
    installedShortcut: '',
    defaultShortcut: '',
    effectiveShortcut: '',
    isShortcutOverridden: false
})

describe('setup shortcut state', () => {
    it('stores pending shortcuts for actions that are not installed yet', () => {
        const entry = shortcutState()

        setSetupShortcut(entry, 'F12')

        expect(entry.effectiveShortcut).toBe('F12')
        expect(entry.installedShortcut).toBe('')
        expect(entry.isShortcutOverridden).toBe(false)
        expect(canResetSetupShortcut(entry)).toBe(true)
    })

    it('marks installed shortcuts that differ from the default as custom', () => {
        const entry = shortcutState({
            installedActionName: 'installed-guid',
            defaultShortcut: '',
            installedShortcut: ''
        })

        setSetupShortcut(entry, 'F12')

        expect(entry.installedShortcut).toBe('F12')
        expect(entry.effectiveShortcut).toBe('F12')
        expect(entry.isShortcutOverridden).toBe(true)
        expect(getDisplayedSetupShortcut(entry)).toBe('F12 [custom]')
        expect(canResetSetupShortcut(entry)).toBe(true)
    })

    it('resets installed custom shortcuts to the default', () => {
        const entry = shortcutState({
            installedActionName: 'installed-guid',
            defaultShortcut: 'Ctrl+P',
            installedShortcut: 'F12',
            effectiveShortcut: 'F12',
            isShortcutOverridden: true
        })

        resetSetupShortcut(entry)

        expect(entry.installedShortcut).toBe('Ctrl+P')
        expect(entry.effectiveShortcut).toBe('Ctrl+P')
        expect(entry.isShortcutOverridden).toBe(false)
        expect(canResetSetupShortcut(entry)).toBe(false)
    })

    it('resets pending shortcuts without inventing an installed shortcut', () => {
        const entry = shortcutState({
            defaultShortcut: '',
            installedShortcut: '',
            effectiveShortcut: 'F12'
        })

        resetSetupShortcut(entry)

        expect(entry.installedShortcut).toBe('')
        expect(entry.effectiveShortcut).toBe('')
        expect(entry.isShortcutOverridden).toBe(false)
        expect(canResetSetupShortcut(entry)).toBe(false)
    })

    it('displays custom marker when installed shortcut was changed outside setup', () => {
        const entry = shortcutState({
            installedActionName: 'installed-guid',
            defaultShortcut: '',
            installedShortcut: 'F12',
            effectiveShortcut: 'F12'
        })

        updateShortcutOverrideState(entry)

        expect(getDisplayedSetupShortcut(entry)).toBe('F12 [custom]')
    })
})
