import * as log from '@dsf/common/log'

/**
 * Reads a file and tries to deserialize it to the specified type, assuming the file content
 * is a valid JSON
 * @param filePath the file to read
 * @param cache if true, cache the file into memory
 * @returns the deserialized object or null of the file cannot be deserialized
 */
export const readFromFile = <T>(filePath: string, cache: boolean = false): T | null => {
    try {
        var file = new DzFile(filePath)
        if (!file.exists()) return null
        file.open(DzFile.ReadOnly)
        file.setCaching(cache)
        var content = file.read().toString()
        var items: T = JSON.parse(content)
        file.close()
        file.deleteLater()
        return items
    } catch (error) {
        log.error(`Error while reading file ${filePath}`)
        return null
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
    try {
        if (!filePath || !content) return false
        let fileInfo = new DzFileInfo(filePath)
        let path = fileInfo.absolutePath()
        var dzDir = new DzDir(path)
        dzDir.mkpath(path)
        var file = new DzFile(`${filePath}`)
        file.open(DzFile.WriteOnly)
        file.write(content)
        file.close()
        fileInfo.deleteLater()
        file.deleteLater()
        return true
    } catch (error) {
        log.error(`Error while saving file ${filePath}`)
        return false
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
        if (!file.exists()) return
        file.remove(filePath)
        file.deleteLater()
        return true
    } catch (error) {
        log.error(`Error while deleting file ${filePath}`)
        return false
    }
}
