import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const started: Array<{
    info: string
    totalSteps: number
    isCancellable: boolean
    showTimeElapsed: boolean
}> = []
const steps: number[] = []

const installProgressGlobals = (cancelled = false): void => {
    vi.stubGlobal('startProgress', (info: string, totalSteps: number, isCancellable: boolean, showTimeElapsed: boolean) => {
        started.push({ info, totalSteps, isCancellable, showTimeElapsed })
    })
    vi.stubGlobal('stepProgress', (count = 1) => {
        steps.push(count)
    })
    vi.stubGlobal('finishProgress', vi.fn())
    vi.stubGlobal('progressIsCancelled', () => cancelled)
    vi.stubGlobal('processEvents', vi.fn())
}

beforeEach(() => {
    started.length = 0
    steps.length = 0
    vi.resetModules()
})

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('withProgress', () => {
    it('starts progress, exposes a manual step handle, and finishes after callback returns', async () => {
        installProgressGlobals()
        const { withProgress } = await import('./progress-helper')

        const result = withProgress('Manual Work', 4, (progress) => {
            progress.step()
            progress.step(2)
            return 'done'
        })

        expect(result).toBe('done')
        expect(started).toEqual([
            {
                info: 'Manual Work',
                totalSteps: 4,
                isCancellable: true,
                showTimeElapsed: true,
            },
        ])
        expect(steps).toEqual([1, 2])
        expect(finishProgress).toHaveBeenCalledTimes(1)
    })

    it('finishes progress when the callback throws', async () => {
        installProgressGlobals()
        const { withProgress } = await import('./progress-helper')

        expect(() => withProgress('Manual Work', 2, () => {
            throw new Error('failed phase')
        })).toThrow('failed phase')

        expect(finishProgress).toHaveBeenCalledTimes(1)
    })

    it('reports cancellation consistently with cancellable progress', async () => {
        installProgressGlobals(true)
        const { withProgress } = await import('./progress-helper')

        let callbackCancelled = false
        withProgress('Manual Work', 2, (progress) => {
            callbackCancelled = progress.isCancelled()
            progress.step()
        })

        expect(callbackCancelled).toBe(true)
        expect(processEvents).toHaveBeenCalledTimes(1)
        expect(steps).toEqual([])
        expect(finishProgress).toHaveBeenCalledTimes(1)
    })
})

describe('progress', () => {
    it('finishes progress when an item callback stops the loop', async () => {
        installProgressGlobals()
        const { progress } = await import('./progress-helper')

        progress('Array Work', [1, 2, 3], (item: number) => item !== 2)

        expect(steps).toEqual([1])
        expect(finishProgress).toHaveBeenCalledTimes(1)
    })
})
