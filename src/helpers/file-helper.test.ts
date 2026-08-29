import { beforeEach, describe, expect, it, vi } from 'vitest'

const files = vi.hoisted(() => new Map<string, string>())
const openFailures = vi.hoisted(() => new Set<string>())
const renameFailures = vi.hoisted(() => new Set<string>())
const writeResult = vi.hoisted(() => ({ value: null as number | null }))
const writtenContent = vi.hoisted(() => ({ value: null as string | null }))

vi.mock('@dsf/common/log', () => ({ error: vi.fn() }))

class FakeFile {
    static ReadOnly = 1
    static WriteOnly = 2

    constructor(private path: string) { }

    exists() {
        return files.has(this.path)
    }

    open(mode: number) {
        if (openFailures.has(this.path)) return false
        if (mode === FakeFile.WriteOnly) files.set(this.path, '')
        return true
    }

    write(content: string) {
        const count = writeResult.value ?? content.length
        if (count >= 0) files.set(this.path, writtenContent.value ?? content.substring(0, Math.min(count, content.length)))
        return count
    }

    read() {
        return files.get(this.path) ?? ''
    }

    close() { }

    rename(newPath: string) {
        if (renameFailures.has(`${this.path}->${newPath}`) || files.has(newPath)) return false
        const content = files.get(this.path)
        if (content === undefined) return false
        files.delete(this.path)
        files.set(newPath, content)
        this.path = newPath
        return true
    }

    remove() {
        return files.delete(this.path)
    }

    setCaching() { }
    deleteLater() { }
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

import { readFromFile, saveToFile } from './file-helper'

const filePath = 'C:/temp/settings.json'

describe('saveToFile', () => {
    beforeEach(() => {
        files.clear()
        openFailures.clear()
        renameFailures.clear()
        writeResult.value = null
        writtenContent.value = null
    })

    it('fails without changing the destination when the file cannot be opened', () => {
        files.set(filePath, 'old')
        openFailures.add(filePath)
        openFailures.add(`${filePath}.tmp`)

        expect(saveToFile(filePath, '{}')).toBe(false)
        expect(files.get(filePath)).toBe('old')
    })

    it('fails without changing the destination when writing reports an error', () => {
        files.set(filePath, 'old')
        writeResult.value = -1

        expect(saveToFile(filePath, '{}')).toBe(false)
        expect(files.get(filePath)).toBe('old')
    })

    it('fails without changing the destination when writing stores no bytes', () => {
        files.set(filePath, 'old')
        writeResult.value = 0

        expect(saveToFile(filePath, '{}')).toBe(false)
        expect(files.get(filePath)).toBe('old')
    })

    it('fails without changing the destination after a partial write', () => {
        files.set(filePath, 'old')
        writeResult.value = 1

        expect(saveToFile(filePath, '{}')).toBe(false)
        expect(files.get(filePath)).toBe('old')
        expect(files.has(`${filePath}.tmp`)).toBe(false)
    })

    it('fails without changing the destination when written content does not verify', () => {
        files.set(filePath, 'old')
        writeResult.value = 2
        writtenContent.value = '{'

        expect(saveToFile(filePath, '{}')).toBe(false)
        expect(files.get(filePath)).toBe('old')
    })

    it('restores the destination when replacing it fails', () => {
        files.set(filePath, 'old')
        renameFailures.add(`${filePath}.tmp->${filePath}`)

        expect(saveToFile(filePath, '{}')).toBe(false)
        expect(files.get(filePath)).toBe('old')
        expect(files.has(`${filePath}.tmp`)).toBe(false)
        expect(files.has(`${filePath}.bak`)).toBe(false)
    })

    it('replaces the destination after a complete write', () => {
        files.set(filePath, 'old')

        expect(saveToFile(filePath, '{}')).toBe(true)
        expect(files.get(filePath)).toBe('{}')
        expect(files.has(`${filePath}.tmp`)).toBe(false)
        expect(files.has(`${filePath}.bak`)).toBe(false)
    })
})

describe('readFromFile', () => {
    beforeEach(() => {
        files.clear()
        openFailures.clear()
        renameFailures.clear()
        writeResult.value = null
        writtenContent.value = null
    })

    it('recovers an interrupted replacement from its backup', () => {
        files.set(`${filePath}.bak`, '{"restored":true}')

        expect(readFromFile<{ restored: boolean }>(filePath)).toEqual({ restored: true })
        expect(files.has(filePath)).toBe(true)
        expect(files.has(`${filePath}.bak`)).toBe(false)
    })
})
