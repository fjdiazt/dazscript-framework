import { describe, expect, it } from 'vitest'
import { contains } from './string-helper'

describe('string contains helper', () => {
    it('matches any requested token case-insensitively when requested', () => {
        expect(contains('Follower/Attachment/Head/Face/Eyelashes', ['hair', 'eyelashes'], true)).toBe(true)
    })

    it('keeps matching case-sensitive by default', () => {
        expect(contains('Follower/Attachment/Head/Face/Eyelashes', 'eyelashes')).toBe(false)
    })
})
