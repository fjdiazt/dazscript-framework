import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Delayed } from './delayed'

let timer: FakeTimer

class FakeTimer {
    private callback: () => void = () => { }
    timeout = { connect: (callback: () => void) => this.callback = callback }
    running = false

    constructor() { timer = this }
    start() { this.running = true }
    stop() { this.running = false }
    fire() { if (this.running) this.callback() }
}

vi.stubGlobal('DzTimer', FakeTimer)

describe('Delayed', () => {
    beforeEach(() => { timer = undefined as any })

    it('flushes a pending action once and cancels its timer', () => {
        const action = vi.fn()
        const delayed = new Delayed(action)
        delayed.trigger()

        expect(() => (delayed as any).flush()).not.toThrow()
        expect(action).toHaveBeenCalledOnce()

        timer.fire()
        expect(action).toHaveBeenCalledOnce()
    })
})
