import { beforeEach, describe, expect, it, vi } from 'vitest'
import { confirm, prompt } from './message-box-helper'

vi.mock('@dsf/common/log', () => ({ debug: vi.fn() }))

describe('message-box-helper', () => {
    const question = vi.fn()

    beforeEach(() => {
        question.mockReset()
        vi.stubGlobal('MessageBox', { question })
    })

    it('treats the first confirm button as ok', () => {
        question.mockReturnValue(0)

        expect(confirm('Continue?')).toEqual({ ok: true, cancel: false })
    })

    it('treats the second confirm button as cancel', () => {
        question.mockReturnValue(1)

        expect(confirm('Continue?')).toEqual({ ok: false, cancel: true })
    })

    it('treats the first prompt button as cancel so Esc is also cancel', () => {
        question.mockReturnValue(0)

        expect(prompt('Reset?', 'Reset', 'Zero', 'Default')).toEqual({ cancel: true, selection: -1 })
    })

    it('maps the second prompt button to the first selection', () => {
        question.mockReturnValue(1)

        expect(prompt('Reset?', 'Reset', 'Zero', 'Default')).toEqual({ cancel: false, selection: 0 })
    })

    it('maps the third prompt button to the second selection', () => {
        question.mockReturnValue(2)

        expect(prompt('Reset?', 'Reset', 'Zero', 'Default')).toEqual({ cancel: false, selection: 1 })
    })
})
