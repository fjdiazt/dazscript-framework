import { describe, expect, it } from 'vitest'
import { clearShortcutConflicts } from './set-keyboard-shortcut-conflicts'

describe('clearShortcutConflicts', () => {
    it('clears conflicting actions without clearing the target action', () => {
        const cleared: string[] = []

        clearShortcutConflicts('target-action', [
            { name: 'target-action', text: 'Target' } as DzAction,
            { name: 'old-owner', text: 'Old Owner' } as DzAction,
            { name: 'other-owner', text: 'Other Owner' } as DzAction
        ], (name) => {
            cleared.push(name)
        })

        expect(cleared).toEqual(['old-owner', 'other-owner'])
    })
})
