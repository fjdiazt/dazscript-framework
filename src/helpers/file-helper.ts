import * as log from '@dsf/common/log'

/**
 * Reads a file and tries to deserialize it to the specified type, assuming the file content
 * is a valid JSON
 * @param filePath the file to read
 * @param cache if true, cache the file into memory
 * @returns the deserialized object or null of the file cannot be deserialized
 */
export const readFromFile = <T>(filePath: string, cache: boolean = false): T | null => {
    let file: DzFile | null = null
    let opened = false
    try {
        file = new DzFile(filePath)
        if (!file.exists()) {
            file.deleteLater()
            file = null

            const backup = new DzFile(`${filePath}.bak`)
            if (!backup.exists() || !backup.rename(filePath)) {
                backup.deleteLater()
                return null
            }
            backup.deleteLater()
            file = new DzFile(filePath)
        }

        opened = file.open(DzFile.ReadOnly)
        if (!opened) return null
        file.setCaching(cache)
        var content = file.read().toString()
        var items: T = JSON.parse(content)
        return items
    } catch (error) {
        log.error(`Error while reading file ${filePath}`)
        return null
    } finally {
        if (opened) file?.close()
        file?.deleteLater()
    }
}

/**
 *
 * @param path
 * @param fileName
 * @param content
 * @returns
 */
export const saveToFile = (filePath: string, content: string): boolean => {
    let fileInfo: DzFileInfo | null = null
    let tempFile: DzFile | null = null
    let verifyFile: DzFile | null = null
    let targetFile: DzFile | null = null
    let backupFile: DzFile | null = null
    let opened = false
    let verifyOpened = false
    let committed = false
    try {
        if (!filePath || !content) return false
        fileInfo = new DzFileInfo(filePath)
        let path = fileInfo.absolutePath()
        var dzDir = new DzDir(path)
        dzDir.mkpath(path)

        const tempPath = `${filePath}.tmp`
        const backupPath = `${filePath}.bak`
        tempFile = new DzFile(tempPath)
        if (tempFile.exists() && !tempFile.remove()) return false

        opened = tempFile.open(DzFile.WriteOnly)
        if (!opened) return false
        const written = tempFile.write(content)
        tempFile.close()
        opened = false
        if (written < content.length) return false

        verifyFile = new DzFile(tempPath)
        verifyOpened = verifyFile.open(DzFile.ReadOnly)
        if (!verifyOpened) return false
        const verified = verifyFile.read().toString() === content
        verifyFile.close()
        verifyOpened = false
        if (!verified) return false

        targetFile = new DzFile(filePath)
        backupFile = new DzFile(backupPath)
        const hadTarget = targetFile.exists()
        if (hadTarget) {
            if (backupFile.exists() && !backupFile.remove()) return false
            if (!targetFile.rename(backupPath)) return false
        }

        if (!tempFile.rename(filePath)) {
            if (hadTarget) backupFile.rename(filePath)
            return false
        }

        committed = true
        if (hadTarget && backupFile.exists()) backupFile.remove()
        return true
    } catch (error) {
        log.error(`Error while saving file ${filePath}`)
        return false
    } finally {
        if (opened) tempFile?.close()
        if (verifyOpened) verifyFile?.close()
        if (!committed && tempFile?.exists()) tempFile.remove()
        fileInfo?.deleteLater()
        tempFile?.deleteLater()
        verifyFile?.deleteLater()
        targetFile?.deleteLater()
        backupFile?.deleteLater()
    }
}

/**
 *
 * @param path
 * @param fileName
 * @param content
 * @returns
 * @deprecated must remove path argument
 */
export const saveToFileOld = (path: string, fileName: string, content: string): boolean => {
    try {
        if (!path || !fileName || !content) return false
        var dzDir = new DzDir(path)
        dzDir.mkpath(path)
        var file = new DzFile(`${path}${fileName}`)
        file.open(DzFile.WriteOnly)
        file.write(content)
        file.close()
        file.deleteLater()
        return true
    } catch (error) {
        log.error(`Error while saving file ${path}${fileName}`)
        return false
    }
}

export const deleteFile = (filePath: string): boolean => {
    try {
        var file = new DzFile(filePath)
        if (!file.exists()) return false
        file.remove(/*filePath*/)
        file.deleteLater()
        return true
    } catch (error) {
        log.error(`Error while deleting file ${filePath}`)
        return false
    }
}
