import { beforeEach, describe, expect, it, vi } from 'vitest'

const dialog = vi.hoisted(() => ({ exec: vi.fn(() => true), close: vi.fn() }))
const restoreObjectName = vi.hoisted(() => vi.fn())

vi.mock('./builders/dialog-builder', () => ({
    DialogBuilder: class {
        context = { dialog }

        build(setup: () => void) {
            setup()
            return dialog
        }

        restoreObjectName() {
            restoreObjectName()
        }
    }
}))

import { BasicDialog } from './basic-dialog'

class TestDialog extends BasicDialog {
    builds = 0

    constructor() {
        super('Test')
    }

    protected build(): void {
        this.builds++
    }
}

describe('BasicDialog.prepare', () => {
    beforeEach(() => vi.clearAllMocks())

    it('builds and returns the dialog without entering its modal event loop', () => {
        const subject = new TestDialog()

        const prepared = subject.prepare()

        expect(prepared).toBe(dialog)
        expect(subject.builds).toBe(1)
        expect(dialog.exec).not.toHaveBeenCalled()
        expect(restoreObjectName).toHaveBeenCalledOnce()
    })
})
