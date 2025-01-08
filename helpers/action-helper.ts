import { debug, warn } from '@dsf/common/log'
import { mainWindow } from '@dsf/lib/global'
import { isGUID } from './string-helper'

const actionMgr = mainWindow.getActionMgr()

export const isCustomAction = (action: string | DzAction): boolean => {
    return typeof action === 'string'
        ? isGUID(action)
        : action.inherits('DzCustomAction')
}

export const findAction = (name: string): DzAction | null => {
    return isCustomAction(name)
        ? findCustomAction(name)
        : actionMgr.findAction(name)
}

const findCustomAction = (name: string): DzCustomAction | null => {
    let index = actionMgr.findCustomAction(name)
    return index >= 0
        ? actionMgr.getCustomActionByIndex(index)
        : null
}

export const triggerAction = (name: string) => {
    findAction(name)?.trigger()
}

export const setActionShortcut = (name: string, shortcut: string) => {
    let action = findAction(name)
    if (!action) return
    if (isCustomAction(action)) {
        actionMgr.setCustomActionShortcut(actionMgr.findCustomAction(name), shortcut)
        debug(`Shortcut set for Custom Action ${action.text}: ${shortcut}`)
    }
    else {
        actionMgr.setAccel(name, shortcut)
        debug(`Shortcut set for Action ${action.text}: ${shortcut}`)
    }

}

export const clearActionShorcut = (name: string) => {
    let action = findAction(name)
    if (!action) return
    if (isCustomAction(action)) {
        actionMgr.setCustomActionShortcut(actionMgr.findCustomAction(name), '')
    }
    else {
        actionMgr.setAccel(name, '')
    }
}

export const getActionPixmap = (action: string, icon: string, maxSize?: number): QPixmap | null => {
    try {
        if (!action) return null;
        let isCustom = isCustomAction(action)

        if (isCustom && icon && typeof icon === 'string' && icon) {
            let image: DzImageTexture = (App.getImageMgr() as any)['getImage(QString)'](icon)
            if (image) {
                let size = image.getOriginalImageSize();
                let pixmap = size.width > maxSize || size.height > maxSize
                    ? image.getPreviewPixmap(Math.min(size.width, maxSize), Math.min(size.height, maxSize))
                    : new Pixmap(image.getFilename())

                return pixmap
            }
        }
        else if (!isCustom) {
            let pixmap = App.getStyle().actionPixmap(action, 0, 0)
            return pixmap?.height === 0 ? null : pixmap
        }
    } catch (error) {
        warn(`Error while trying to get icon pixmap: ${error}`)
    }
    return null
}


