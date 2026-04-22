import { debug, warn } from '@dsf/common/log'
import { mainWindow } from '@dsf/core/global'
import { isGUID } from './string-helper'

const actionMgr = mainWindow.getActionMgr()

const shortcutTokenMap: { [key: string]: string } = {
    'CTRL': 'Ctrl',
    'CONTROL': 'Ctrl',
    'SHIFT': 'Shift',
    'ALT': 'Alt',
    'OPTION': 'Alt',
    'WIN': 'Win',
    'WINDOWS': 'Win',
    'CMD': 'Win',
    'COMMAND': 'Win',
    'SPACE': 'Space',
    'HOME': 'Home',
    'END': 'End',
    'INS': 'Ins',
    'INSERT': 'Ins',
    'DEL': 'Del',
    'DELETE': 'Del',
    'TAB': 'Tab',
    'BACKSPACE': 'Backspace',
    'COMMA': 'Comma',
    'PERIOD': 'Period',
    'PLUS': 'Plus',
    'MINUS': 'Minus',
    'PGUP': 'PgUp',
    'PAGEUP': 'PgUp',
    'PGDOWN': 'PgDn',
    'PGDN': 'PgDn',
    'LEFT': 'Left',
    'RIGHT': 'Right',
    'UP': 'Up',
    'DOWN': 'Down',
}

export const normalizeShortcut = (shortcut: string): string => {
    if (!shortcut) return ''

    return shortcut
        .split('+')
        .map(part => part.trim())
        .filter(Boolean)
        .map(part => {
            if (part.length === 1) return part.toUpperCase()

            const key = part.toUpperCase()
            return shortcutTokenMap[key] || part
        })
        .join('+')
}

export const getActionShortcut = (name: string): string => {
    const action = findAction(name)
    if (!action) return ''

    if (isCustomAction(action)) {
        const index = actionMgr.findCustomAction(name)
        if (index < 0) return ''
        return normalizeShortcut(String(actionMgr.getCustomActionShortcut(index) ?? '').trim())
    }

    return normalizeShortcut(String(action.shortcut?.toString() ?? '').trim())
}

type ActionShortcutEntry = {
    action: DzAction
    shortcut: string
}

const getAllActions = (): ActionShortcutEntry[] => {
    const actions: ActionShortcutEntry[] = []

    const numActions = actionMgr.getNumActions()
    for (let i = 0; i < numActions; i++) {
        const action = actionMgr.getAction(i)
        if (!action) continue

        actions.push({
            action,
            shortcut: String(action.shortcut?.toString() ?? '').trim()
        })
    }

    const numCustomActions = actionMgr.getNumCustomActions()
    for (let i = 0; i < numCustomActions; i++) {
        const action = actionMgr.getCustomActionByIndex(i)
        if (!action) continue

        actions.push({
            action,
            shortcut: String(actionMgr.getCustomActionShortcut(i) ?? '').trim()
        })
    }

    return actions
}

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

export const actionExists = (name: string): boolean => {
    return findAction(name) !== null
}

export const getCustomActionFilePath = (name: string): string | null => {
    let index = actionMgr.findCustomAction(name)
    if (index < 0) return null

    let filePath = actionMgr.getCustomActionFile(index)
    return filePath ? filePath.toString() : null
}

export const findCustomActionByFilePath = (filePath: string): DzCustomAction | null => {
    let count = actionMgr.getNumCustomActions()

    for (let i = 0; i < count; i++) {
        let customActionFile = actionMgr.getCustomActionFile(i)
        if (!customActionFile) continue
        if (customActionFile.toString() !== filePath) continue

        return actionMgr.getCustomActionByIndex(i)
    }

    return null
}

const findCustomAction = (name: string): DzCustomAction | null => {
    let index = actionMgr.findCustomAction(name)
    return index >= 0
        ? actionMgr.getCustomActionByIndex(index)
        : null
}

export const triggerAction = (name: string) => {
    const action = findAction(name)
    if (!action) {
        warn(`Power Menu - Action not found: "${name}"`)
    }
    debug(`Power Menu - Trigger Action: "${action?.text}" (${name})`)
    action?.trigger()
}

export const setActionShortcut = (name: string, shortcut: string) => {
    let action = findAction(name)
    if (!action) return
    const normalizedShortcut = normalizeShortcut(shortcut)
    if (isCustomAction(action)) {
        actionMgr.setCustomActionShortcut(actionMgr.findCustomAction(name), normalizedShortcut)
        debug(`Shortcut set for Custom Action ${action.text}: ${normalizedShortcut}`)
    }
    else {
        actionMgr.setAccel(name, normalizedShortcut)
        debug(`Shortcut set for Action ${action.text}: ${normalizedShortcut}`)
    }

}

export const findActionsForShortcut = (shortcut: string): DzAction[] => {
    if (!shortcut) return []

    const normalizedShortcut = normalizeShortcut(shortcut)
    const resultEntries = getAllActions().filter(({ shortcut: actionShortcut }) =>
        actionShortcut && normalizeShortcut(actionShortcut) === normalizedShortcut
    )
    const result = resultEntries.map(({ action }) => action)

    debug(
        `[ShortcutLookup] input="${shortcut}" normalized="${normalizedShortcut}" result=${resultEntries.map(({ action, shortcut }) => `${action?.text || action?.name}=${shortcut}`).join(', ')}`
    )

    return result
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
                let pixmap: QPixmap
                // Only clamp if maxSize is provided and image is larger
                if (maxSize && (size.width > maxSize || size.height > maxSize)) {
                    pixmap = image.getPreviewPixmap(Math.min(size.width, maxSize), Math.min(size.height, maxSize))
                } else {
                    pixmap = new Pixmap(image.getFilename())
                }
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


