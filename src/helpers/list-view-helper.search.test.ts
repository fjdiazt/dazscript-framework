import { describe, expect, it } from 'vitest'
import * as search from './list-view-helper'

const matcher = (keywords: string): ((text: string) => boolean) =>
    (search as any).createSearchMatcher?.(keywords) ?? (() => false)

describe('list search syntax', () => {
    it('keeps unquoted terms as case-insensitive substring matches', () => {
        expect(matcher('face')('Surface Controls')).toBe(true)
        expect(matcher('FACE')('Face Transfer')).toBe(true)
    })

    it('keeps unquoted multi-term searches order-independent', () => {
        expect(matcher('render settings')('Open Settings for Render')).toBe(true)
        expect(matcher('render settings')('Open Render')).toBe(false)
    })

    it('matches a quoted term only at word boundaries', () => {
        const matches = matcher('"face"')

        expect(matches('Open Face Controls')).toBe(true)
        expect(matches('Face, Controls')).toBe(true)
        expect(matches('Surface Controls')).toBe(false)
    })

    it('matches a quoted phrase only when adjacent and bounded', () => {
        const matches = matcher('"face rig"')

        expect(matches('Load Face Rig Controls')).toBe(true)
        expect(matches('Load Face Advanced Rig Controls')).toBe(false)
        expect(matches('Load Surface Rig Controls')).toBe(false)
    })

    it('requires both normal terms and quoted phrases', () => {
        const matches = matcher('render "face rig"')

        expect(matches('Render the Face Rig')).toBe(true)
        expect(matches('Edit the Face Rig')).toBe(false)
    })

    it('treats unmatched quotes as literal characters', () => {
        const matches = matcher('12"')

        expect(matches('12" Figure')).toBe(true)
        expect(matches('12 Figure')).toBe(false)
    })

    it('accepts doubled quotes inside a quoted phrase', () => {
        expect(matcher('"12"" figure"')('Load 12" Figure')).toBe(true)
    })
})
