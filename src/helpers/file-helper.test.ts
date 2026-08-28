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
    beforeEach(() => vi.clearAllMocks())

    it('fails without writing when the file cannot be opened', () => {
        expect(saveToFile('C:/temp/settings.json', '{}')).toBe(false)
        expect(open).toHaveBeenCalledWith(FakeFile.WriteOnly)
        expect(write).not.toHaveBeenCalled()
    })
})
