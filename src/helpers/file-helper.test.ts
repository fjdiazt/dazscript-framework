import { beforeEach, describe, expect, it, vi } from 'vitest'

const open = vi.hoisted(() => vi.fn(() => false))
const write = vi.hoisted(() => vi.fn(() => 0))
const close = vi.hoisted(() => vi.fn())

vi.mock('@dsf/common/log', () => ({ error: vi.fn() }))

class FakeFile {
    static WriteOnly = 2

    open = open
    write = write
    close = close
    deleteLater = vi.fn()
}

class FakeFileInfo {
    absolutePath() {
        return 'C:/temp'
    }

    deleteLater() { }
}

class FakeDir {
    mkpath() {
        return true
    }
}

vi.stubGlobal('DzFile', FakeFile)
vi.stubGlobal('DzFileInfo', FakeFileInfo)
vi.stubGlobal('DzDir', FakeDir)

import { saveToFile } from './file-helper'

describe('saveToFile', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        open.mockReturnValue(false)
        write.mockReturnValue(-1)
    })

    it('fails without writing when the file cannot be opened', () => {
        expect(saveToFile('C:/temp/settings.json', '{}')).toBe(false)
        expect(open).toHaveBeenCalledWith(FakeFile.WriteOnly)
        expect(write).not.toHaveBeenCalled()
    })

    it('fails when writing reports an error', () => {
        open.mockReturnValue(true)

        expect(saveToFile('C:/temp/settings.json', '{}')).toBe(false)
        expect(write).toHaveBeenCalledWith('{}')
        expect(close).toHaveBeenCalledOnce()
    })

    it('fails when writing stores no bytes', () => {
        open.mockReturnValue(true)
        write.mockReturnValue(0)

        expect(saveToFile('C:/temp/settings.json', '{}')).toBe(false)
        expect(close).toHaveBeenCalledOnce()
    })

    it('succeeds when the file opens and writes', () => {
        open.mockReturnValue(true)
        write.mockReturnValue(2)

        expect(saveToFile('C:/temp/settings.json', '{}')).toBe(true)
        expect(close).toHaveBeenCalledOnce()
    })
})
