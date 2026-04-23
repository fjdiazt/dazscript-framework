import { describe, expect, it, vi } from 'vitest'
import { BooleanObservable, Observable } from './observable'

// ─── Observable ───────────────────────────────────────────────────────────────

describe('Observable — constructor', () => {
    it('initializes with undefined when no value is provided', () => {
        const obs = new Observable<string>()
        expect(obs.value).toBeUndefined()
    })

    it('initializes with the provided value', () => {
        const obs = new Observable(42)
        expect(obs.value).toBe(42)
    })

    it('registers an onChange callback provided at construction', () => {
        const cb = vi.fn()
        const obs = new Observable<string>('a', cb)
        obs.value = 'b'
        expect(cb).toHaveBeenCalledWith('b')
    })
})

describe('Observable — value setter', () => {
    it('updates the stored value', () => {
        const obs = new Observable(1)
        obs.value = 2
        expect(obs.value).toBe(2)
    })

    it('fires connected callbacks with the new value', () => {
        const cb = vi.fn()
        const obs = new Observable(0)
        obs.connect(cb)
        obs.value = 99
        expect(cb).toHaveBeenCalledOnce()
        expect(cb).toHaveBeenCalledWith(99)
    })

    it('fires all connected callbacks', () => {
        const cb1 = vi.fn()
        const cb2 = vi.fn()
        const obs = new Observable(0)
        obs.connect(cb1).connect(cb2)
        obs.value = 1
        expect(cb1).toHaveBeenCalledWith(1)
        expect(cb2).toHaveBeenCalledWith(1)
    })

    it('does not fire callbacks when the value is unchanged', () => {
        const cb = vi.fn()
        const obs = new Observable('same')
        obs.connect(cb)
        obs.value = 'same'
        expect(cb).not.toHaveBeenCalled()
    })
})

describe('Observable — connect / disconnect', () => {
    it('returns this for chaining', () => {
        const obs = new Observable(0)
        const cb = vi.fn()
        expect(obs.connect(cb)).toBe(obs)
    })

    it('does not register the same callback twice', () => {
        const cb = vi.fn()
        const obs = new Observable(0)
        obs.connect(cb).connect(cb)
        obs.value = 1
        expect(cb).toHaveBeenCalledOnce()
    })

    it('stops firing a disconnected callback', () => {
        const cb = vi.fn()
        const obs = new Observable(0)
        obs.connect(cb)
        obs.disconnect(cb)
        obs.value = 1
        expect(cb).not.toHaveBeenCalled()
    })

    it('ignores disconnect of a callback that was never connected', () => {
        const obs = new Observable(0)
        expect(() => obs.disconnect(vi.fn())).not.toThrow()
    })
})

describe('Observable — pause / resume', () => {
    it('suppresses callbacks inside the pause block', () => {
        const cb = vi.fn()
        const obs = new Observable(0)
        obs.connect(cb)
        obs.pause(() => { obs.value = 1 })
        expect(cb).not.toHaveBeenCalled()
    })

    it('still updates the value during the pause block', () => {
        const obs = new Observable(0)
        obs.pause(() => { obs.value = 99 })
        expect(obs.value).toBe(99)
    })

    it('resumes callbacks after the pause block completes', () => {
        const cb = vi.fn()
        const obs = new Observable(0)
        obs.connect(cb)
        obs.pause(() => { obs.value = 1 })
        obs.value = 2
        expect(cb).toHaveBeenCalledOnce()
        expect(cb).toHaveBeenCalledWith(2)
    })

    it('suppresses callbacks when paused manually without a block', () => {
        const cb = vi.fn()
        const obs = new Observable(0)
        obs.connect(cb)
        obs.pause()
        obs.value = 1
        expect(cb).not.toHaveBeenCalled()
    })

    it('resumes callbacks after an explicit resume()', () => {
        const cb = vi.fn()
        const obs = new Observable(0)
        obs.connect(cb)
        obs.pause()
        obs.resume()
        obs.value = 1
        expect(cb).toHaveBeenCalledWith(1)
    })
})

describe('Observable — trigger', () => {
    it('fires all callbacks with the current value', () => {
        const cb = vi.fn()
        const obs = new Observable('x')
        obs.connect(cb)
        obs.trigger()
        expect(cb).toHaveBeenCalledWith('x')
    })

    it('does not fire callbacks when paused', () => {
        const cb = vi.fn()
        const obs = new Observable('x')
        obs.connect(cb)
        obs.pause()
        obs.trigger()
        expect(cb).not.toHaveBeenCalled()
    })
})

describe('Observable — setSilently', () => {
    it('updates the value without firing callbacks', () => {
        const cb = vi.fn()
        const obs = new Observable(0)
        obs.connect(cb)
        obs.setSilently(5)
        expect(obs.value).toBe(5)
        expect(cb).not.toHaveBeenCalled()
    })
})

describe('Observable — toJSON', () => {
    it('returns the current value', () => {
        const obs = new Observable(42)
        expect(obs.toJSON()).toBe(42)
    })
})

describe('Observable — intercept: beforeChange', () => {
    it('transforms the incoming value before it is applied', () => {
        const obs = new Observable<string>('')
        obs.intercept((_prev, current) => current.toUpperCase())
        obs.value = 'hello'
        expect(obs.value).toBe('HELLO')
    })

    it('passes the transformed value to callbacks', () => {
        const cb = vi.fn()
        const obs = new Observable<string>('')
        obs.intercept((_prev, current) => current.trim())
        obs.connect(cb)
        obs.value = '  hi  '
        expect(cb).toHaveBeenCalledWith('hi')
    })

    it('blocks a change when beforeChange returns the previous value', () => {
        const cb = vi.fn()
        const obs = new Observable(5)
        // reject negative numbers — return prev unchanged
        obs.intercept((prev, current) => current < 0 ? prev : current)
        obs.connect(cb)
        obs.value = -1
        expect(obs.value).toBe(5)
        expect(cb).not.toHaveBeenCalled()
    })
})

describe('Observable — intercept: afterChange', () => {
    it('applies a post-set transformation until the value stabilizes', () => {
        const obs = new Observable(0)
        // clamp to [0, 100]: if already in range afterChange returns same value → loop ends
        obs.intercept(
            (_prev, current) => current,
            (_prev, current) => Math.max(0, Math.min(100, current))
        )
        obs.value = 150
        expect(obs.value).toBe(100)
    })

    it('fires callbacks with the afterChange result', () => {
        const cb = vi.fn()
        const obs = new Observable(0)
        obs.intercept(
            (_prev, current) => current,
            (_prev, current) => Math.max(0, Math.min(100, current))
        )
        obs.connect(cb)
        obs.value = 200
        expect(cb).toHaveBeenLastCalledWith(100)
    })

    it('throws when afterChange never stabilizes (infinite loop guard)', () => {
        const obs = new Observable(0)
        obs.intercept(
            (_prev, current) => current,
            (_prev, current) => current + 1  // always returns a new value
        )
        expect(() => { obs.value = 1 }).toThrow(/afterChange exceeded depth/)
    })
})

describe('Observable — re-entrant set (coalescing)', () => {
    it('applies only the last value requested during an active callback', () => {
        const obs = new Observable(0)
        const calls: number[] = []

        obs.connect((v) => {
            calls.push(v)
            if (v === 1) {
                obs.value = 2  // queued as pending
                obs.value = 3  // overwrites pending — only 3 should run
            }
        })

        obs.value = 1
        expect(obs.value).toBe(3)
        expect(calls).toEqual([1, 3])
    })

    it('does not produce a chained set when the pending value equals current', () => {
        const cb = vi.fn()
        const obs = new Observable(0)

        obs.connect(() => {
            obs.value = obs.value  // set to same — should be a no-op after coalescing
        })
        obs.connect(cb)

        obs.value = 1
        // cb fires once (for the initial set to 1); no chained set because pending === current
        expect(cb).toHaveBeenCalledOnce()
    })
})

describe('Observable — chained sets (listener-driven)', () => {
    it('processes a value requested by a listener after the current cycle', () => {
        const obs = new Observable(0)
        const calls: number[] = []

        obs.connect((v) => {
            calls.push(v)
            if (v === 1) obs.value = 2  // request one further change only
        })

        obs.value = 1
        expect(obs.value).toBe(2)
        expect(calls).toEqual([1, 2])
    })

    it('throws when a listener causes an infinite chain of distinct values (loop guard)', () => {
        const obs = new Observable(0)
        obs.connect((v) => { obs.value = v + 1 })  // always requests a different value
        expect(() => { obs.value = 1 }).toThrow(/Too many chained set operations/)
    })
})

describe('Observable — custom equals', () => {
    it('uses the provided comparator to decide whether the value changed', () => {
        const cb = vi.fn()
        const obs = new Observable<string>('hello', undefined, (a, b) => a?.toLowerCase() === b?.toLowerCase())
        obs.connect(cb)
        obs.value = 'HELLO'  // equal by custom comparator → no change
        expect(cb).not.toHaveBeenCalled()
        expect(obs.value).toBe('hello')
    })
})

// ─── BooleanObservable ────────────────────────────────────────────────────────

describe('Observable — resilience: callback throws', () => {
    it('remains usable after a callback throws', () => {
        const obs = new Observable(0)
        const boom = () => { throw new Error('boom') }
        obs.connect(boom)
        expect(() => { obs.value = 1 }).toThrow('boom')

        // disconnect the bad callback, then confirm _isSetting was cleared
        obs.disconnect(boom)
        const cb = vi.fn()
        obs.connect(cb)
        obs.value = 2
        expect(cb).toHaveBeenCalledWith(2)
    })

    it('resumes notifications after the pause block throws', () => {
        const cb = vi.fn()
        const obs = new Observable(0)
        obs.connect(cb)
        expect(() => obs.pause(() => { throw new Error('boom') })).toThrow('boom')

        // _paused must be false so future changes still fire callbacks
        obs.value = 1
        expect(cb).toHaveBeenCalledWith(1)
    })
})

describe('Observable — subscriber list mutation during fire', () => {
    it('does not call a callback that disconnects itself during the current fire', () => {
        const obs = new Observable(0)
        const calls: string[] = []

        const selfRemove = () => {
            calls.push('selfRemove')
            obs.disconnect(selfRemove)
        }
        const other = () => calls.push('other')

        obs.connect(selfRemove).connect(other)
        obs.value = 1

        expect(calls).toEqual(['selfRemove', 'other'])

        // selfRemove was disconnected — should not fire on the next change
        calls.length = 0
        obs.value = 2
        expect(calls).toEqual(['other'])
    })

    it('does not call a callback added during the current fire', () => {
        const obs = new Observable(0)
        const late = vi.fn()

        obs.connect(() => { obs.connect(late) })
        obs.value = 1

        // late was added mid-fire from a snapshot, should not have been called yet
        expect(late).not.toHaveBeenCalled()

        // but it is registered for future changes
        obs.value = 2
        expect(late).toHaveBeenCalledWith(2)
    })
})

describe('BooleanObservable — combine', () => {
    it('initializes to true when all combined observables are true', () => {
        const a = new BooleanObservable(true)
        const b = new BooleanObservable(true)
        const combined = new BooleanObservable()
        combined.combine(a, b)
        expect(combined.value).toBe(true)
    })

    it('initializes to false when any combined observable is false', () => {
        const a = new BooleanObservable(true)
        const b = new BooleanObservable(false)
        const combined = new BooleanObservable()
        combined.combine(a, b)
        expect(combined.value).toBe(false)
    })

    it('updates to false when a combined observable becomes false', () => {
        const a = new BooleanObservable(true)
        const b = new BooleanObservable(true)
        const combined = new BooleanObservable()
        combined.combine(a, b)
        b.value = false
        expect(combined.value).toBe(false)
    })

    it('updates to true when all combined observables become true', () => {
        const a = new BooleanObservable(true)
        const b = new BooleanObservable(false)
        const combined = new BooleanObservable()
        combined.combine(a, b)
        b.value = true
        expect(combined.value).toBe(true)
    })

    it('throws when attempting to combine with itself', () => {
        const obs = new BooleanObservable(true)
        expect(() => obs.combine(obs)).toThrow('Cannot combine with itself')
    })

    it('does not stack overflow or throw when combined observables change (circular guard)', () => {
        const a = new BooleanObservable(true)
        const b = new BooleanObservable(true)
        const combined = new BooleanObservable()
        combined.combine(a, b)
        expect(() => { a.value = false }).not.toThrow()
        expect(combined.value).toBe(false)
    })
})
