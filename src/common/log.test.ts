import { beforeEach, describe, expect, it, vi } from 'vitest'
import { debug, error, getLogLevel, info, setLogLevel, shouldLog, trace, warn } from './log'

describe('log levels', () => {
    beforeEach(() => {
        ;(globalThis as any).App = {
            debug: vi.fn(),
            log: vi.fn(),
            warning: vi.fn(),
            flushLogBuffer: vi.fn(),
            statusLine: vi.fn()
        }
        setLogLevel('debug')
    })

    it('filters messages below the active level', () => {
        setLogLevel('warn')

        debug('hidden debug')
        info('hidden info')
        warn('visible warn')
        error('visible error')

        expect((globalThis as any).App.debug).not.toHaveBeenCalled()
        expect((globalThis as any).App.log).not.toHaveBeenCalled()
        expect((globalThis as any).App.warning).toHaveBeenCalledTimes(2)
    })

    it('allows trace only when active level is trace', () => {
        setLogLevel('debug')
        trace('hidden trace')

        setLogLevel('trace')
        trace('visible trace')

        expect((globalThis as any).App.debug).toHaveBeenCalledTimes(1)
    })

    it('normalizes invalid levels to debug', () => {
        setLogLevel('not-a-level')

        expect(getLogLevel()).toBe('debug')
        expect(shouldLog('debug')).toBe(true)
    })
})
