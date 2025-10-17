
import * as log from "@dsf/common/log"

export const createPath = (dirPath: string): boolean => {
    try {
        if (!dirPath) return false
        var dzDir = new DzDir(dirPath)
        dzDir.mkpath(dirPath)
        return true
    } catch (error) {
        log.error(`Error while creating directory ${dirPath}`)
        return false
    }
}