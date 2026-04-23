import { debug } from '@dsf/common/log'
import { CustomAction } from '@dsf/core/custom-action'
import { mainWindow } from '@dsf/core/global'
import * as array from '@dsf/helpers/array-helper'
import { keys } from '@dsf/helpers/object-helper'
import { progress } from '@dsf/helpers/progress-helper'
import CustomSet from '@dsf/lib/set'
import { getMenu } from './menu-helper'
import { getScriptPath } from './script-helper'

const actionMgr = mainWindow.getActionMgr()
const paneMgr = mainWindow.getPaneMgr()

const normalizePath = (value: string | null | undefined): string => {
    if (!value) return ''

    return String(value)
        .replace(/\\/g, '/')
        .replace(/\/+/g, '/')
        .replace(/\/$/, '')
        .toLowerCase()
}

const getFileName = (value: string | null | undefined): string => {
    const normalized = normalizePath(value)
    if (!normalized) return ''
    const parts = normalized.split('/')
    return parts[parts.length - 1] ?? ''
}

const getTrailingPathSegments = (value: string | null | undefined, segmentCount: number): string => {
    const normalized = normalizePath(value)
    if (!normalized) return ''

    const segments = normalized.split('/').filter(Boolean)
    if (segments.length === 0) return ''

    return segments.slice(Math.max(segments.length - segmentCount, 0)).join('/')
}

const getStablePathSuffixes = (action: CustomAction, filePath: string): string[] => {
    const suffixes: string[] = []
    const seen: Record<string, true> = {}

    const addSuffixes = (value: string | null | undefined) => {
        const normalized = normalizePath(value)
        if (!normalized) return

        const segments = normalized.split('/').filter(Boolean)
        for (let segmentCount = segments.length; segmentCount >= 1; segmentCount -= 1) {
            const suffix = segments.slice(segments.length - segmentCount).join('/')
            if (!suffix || seen[suffix]) continue
            seen[suffix] = true
            suffixes.push(suffix)
        }
    }

    addSuffixes(filePath)
    addSuffixes(action.filePath)
    return suffixes
}

const pathEndsWithSegments = (filePath: string | null | undefined, trailingSegments: string): boolean => {
    const normalized = normalizePath(filePath)
    if (!normalized || !trailingSegments) return false
    return normalized === trailingSegments || normalized.endsWith(`/${trailingSegments}`)
}

export type CustomActionInstallState = {
    action: CustomAction
    customAction: CustomAction | null
    installedMenu: boolean
    installedToolbar: boolean
}

export type CustomActionTargets = {
    menu: boolean
    toolbar: boolean
}

type CustomActionCandidate = {
    name: string
    text: string
    description: string
    filePath: string
    icon: string
    shortcut: string
}

const cloneAction = (action: CustomAction): CustomAction => ({
    ...action,
})

const resolveActionPaths = (action: CustomAction, scriptsPath: string = getScriptPath()): CustomAction => ({
    ...action,
    filePath: `${scriptsPath}/${action.filePath}`,
    icon: action.icon ? `${scriptsPath}/${action.icon}` : ''
})

const getCustomActionCandidates = (action: CustomAction): CustomActionCandidate[] => {
    const candidates: CustomActionCandidate[] = []
    const actionsCount = actionMgr.getNumCustomActions()

    for (let i = 0; i < actionsCount; i++) {
        const actionFilePath = actionMgr.getCustomActionFile(i)
        const name = actionMgr.getCustomActionName(i)
        const text = actionMgr.getCustomActionText(i)
        const desc = actionMgr.getCustomActionDesc(i)
        const icon = actionMgr.getCustomActionIcon(i)

        candidates.push({
            name: name.toString(),
            text: text.toString(),
            description: desc.toString(),
            filePath: actionFilePath.toString(),
            icon: icon.toString(),
            shortcut: String(actionMgr.getCustomActionShortcut(i) ?? '').trim()
        })
    }

    return candidates
}

const toCustomAction = (candidate: CustomActionCandidate, action: CustomAction): CustomAction => ({
    name: candidate.name,
    text: candidate.text,
    description: candidate.description,
    filePath: candidate.filePath,
    icon: candidate.icon,
    shortcut: candidate.shortcut,
    menuPath: action.menuPath,
    group: action.group,
    sort: action.sort,
    toolbar: action.toolbar
})

const filterUniqueBy = (candidates: CustomActionCandidate[], predicate: (candidate: CustomActionCandidate) => boolean): CustomActionCandidate[] => {
    const matches = candidates.filter(predicate)
    return matches.length === 1 ? matches : []
}

const findByPathHeuristics = (action: CustomAction, filePath: string): CustomActionCandidate[] => {
    const candidates = getCustomActionCandidates(action)
    const normalizedTarget = normalizePath(filePath)

    const exactMatches = filterUniqueBy(candidates, candidate => normalizePath(candidate.filePath) === normalizedTarget)
    if (exactMatches.length > 0) return exactMatches

    const stableSuffixes = getStablePathSuffixes(action, filePath)
    for (const trailingSegments of stableSuffixes) {
        if (!trailingSegments) continue

        const suffixMatches = filterUniqueBy(candidates, candidate => pathEndsWithSegments(candidate.filePath, trailingSegments))
        if (suffixMatches.length > 0) return suffixMatches
    }

    const expectedFileName = getFileName(filePath)
    if (action.menuPath) {
        const menuMatches = filterUniqueBy(candidates, candidate =>
            getFileName(candidate.filePath) === expectedFileName &&
            normalizePath(String(findMenuFor(candidate.name, actionMgr.getMenu())?.getPath() ?? '')) === normalizePath(action.menuPath)
        )
        if (menuMatches.length > 0) return menuMatches
    }

    if (action.toolbar) {
        const toolbarMatches = filterUniqueBy(candidates, candidate =>
            getFileName(candidate.filePath) === expectedFileName &&
            isInstalledToToolbar(action.toolbar, candidate.name)
        )
        if (toolbarMatches.length > 0) return toolbarMatches
    }

    return []
}

export const findAllByFilePath = (action: CustomAction, filePath: string): CustomAction[] => {
    return findByPathHeuristics(action, filePath).map(candidate => toCustomAction(candidate, action))
}

export const findByFilePath = (action: CustomAction, filePath: string): CustomAction | null => {
    const matches = findAllByFilePath(action, filePath)
    return matches.length > 0 ? matches[0] : null
}

export const findMenuFor = (actionName: string, topMenu?: DzActionMenu): DzActionMenu | null => {
    topMenu = topMenu ?? actionMgr.getMenu()
    if (!topMenu.hasItems()) return null
    for (let i = 0; i < topMenu.getNumItems(); i++) {
        const item = topMenu.getItem(i)
        if (item.type == DzActionMenuItem.CustomAction && item.action == actionName)
            return item.getParentMenu()
        if (item.type == DzActionMenuItem.SubMenu) {
            const subMenu = findMenuFor(actionName, item.getSubMenu())
            if (subMenu) return subMenu
        }
    }
    return null
}

export const findInMenu = (menu: DzActionMenu, actionName: string): DzActionMenuItem | null => {
    const items = menu.getItemList()
    for (let i = 0; i < items.length; i += 1) {
        const item = items[i]

        if (item.type != DzActionMenuItem.CustomAction) {
            continue
        }

        if (item.action == actionName) {
            return item
        }
    }

    return null
}

const findToolbarItemIndex = (toolbar: DzToolBar, actionName: string): number => {
    const toolbarItems = toolbar.getItemList()
    for (let i = 0; i < toolbarItems.length; i++) {
        const item = toolbarItems[i]
        if (item.type !== DzToolBarItem.CustomAction) continue
        if (item.action !== actionName) continue
        return i
    }
    return -1
}

const findToolbarItem = (toolbarName: string, actionName: string): DzToolBarItem | null => {
    const toolbar = paneMgr.findToolBar(toolbarName)
    if (!toolbar) return null

    const toolbarItems = toolbar.getItemList()
    for (let i = 0; i < toolbarItems.length; i++) {
        const item = toolbarItems[i]
        if (item.type !== DzToolBarItem.CustomAction) continue
        if (item.action !== actionName) continue
        return item
    }

    return null
}

const isInstalledToToolbar = (toolbarName: string | null | undefined, actionName: string | null | undefined): boolean => {
    if (!toolbarName || !actionName) return false
    return findToolbarItem(toolbarName, actionName) !== null
}

const removeFromMenu = (actionName: string | null | undefined) => {
    if (!actionName) return
    const menu = findMenuFor(actionName, actionMgr.getMenu())
    if (!menu) return

    const menuAction = findInMenu(menu, actionName)
    if (!menuAction) return

    menu.removeItem(menuAction)
    debug(`Action ${actionName} removed from menu`)
}

const removeFromToolbar = (toolbarName: string | null | undefined, actionName: string | null | undefined) => {
    if (!toolbarName || !actionName) return
    const toolbar = paneMgr.findToolBar(toolbarName)
    if (!toolbar) return

    const itemIndex = findToolbarItemIndex(toolbar, actionName)
    if (itemIndex < 0) return

    toolbar.removeItem(itemIndex)
    debug(`Action ${actionName} removed from toolbar ${toolbarName} (index ${itemIndex})`)
}

const removeUnderlyingCustomAction = (actionName: string | null | undefined) => {
    if (!actionName) return

    const index = actionMgr.findCustomAction(actionName)
    if (index < 0) return

    actionMgr.removeCustomAction(index)
    debug(`Action ${actionName} removed`)
}

export const clearToolbar = (toolbarName: string | null | undefined) => {
    if (!toolbarName) return
    const toolbar = paneMgr.findToolBar(toolbarName)
    if (!toolbar) return
    toolbar.clear()
    debug(`Toolbar ${toolbarName} cleared`)
}

export const cleanupEmptyToolbar = (toolbarName: string | null | undefined) => {
    if (!toolbarName) return
    const toolbar = paneMgr.findToolBar(toolbarName)
    if (!toolbar) return

    if (toolbar.hasItems() || toolbar.getItemList().length > 0) return

    toolbar.setClosed(true)
    debug(`Toolbar ${toolbarName} closed (setClosed=true)`)
    toolbar.clear()
    debug(`Toolbar ${toolbarName} cleared`)
    paneMgr.removeToolBar(toolbarName)
    debug(`Toolbar ${toolbarName} removeToolBar called`)
}

export const addToMenu = (action: CustomAction) => {
    if (!action.menuPath || !action.name) return
    const menuPath = `${action.menuPath}/`
    const menu = getMenu(menuPath, true)
    const menuAction = findInMenu(menu, action.name)
    if (menuAction) return
    menu.insertCustomAction(action.name, action.sort ?? -1)
    debug(`Action "${action.text}" added to menu "${menu.getPath()}"`)
}

export const addToToolbar = (action: CustomAction) => {
    if (!action.toolbar || !action.name) return

    let toolbar = paneMgr.findToolBar(action.toolbar)

    if (!toolbar) {
        toolbar = paneMgr.createToolBar(action.toolbar)
        toolbar.dock(DzToolBar.ToolBarTop)
    } else {
        toolbar.setClosed(false)
    }

    if (findToolbarItem(action.toolbar, action.name)) return

    toolbar.insertCustomAction(action.name, action.sort ?? -1)
    debug(`Action "${action.text}" added to toolbar "${action.toolbar}"`)
}

const createOrUpdateCustomAction = (sourceAction: CustomAction, resolvedAction: CustomAction): CustomAction => {
    const existingActions = findAllByFilePath(sourceAction, resolvedAction.filePath)
    existingActions.forEach((existingAction) => {
        removeFromMenu(existingAction.name)
        removeFromToolbar(existingAction.toolbar, existingAction.name)
        removeUnderlyingCustomAction(existingAction.name)
    })

    const name = actionMgr
        .addCustomAction(
            String(resolvedAction.text),
            String(resolvedAction.description),
            String(resolvedAction.filePath),
            true,
            resolvedAction.shortcut ?? "",
            String(resolvedAction.icon ?? '')
        )
        .toString()

    const created = {
        ...resolvedAction,
        name
    } as CustomAction

    if (resolvedAction.shortcut) {
        actionMgr.setCustomActionShortcut(actionMgr.findCustomAction(name), resolvedAction.shortcut)
    }

    debug(`Created Custom Action: ${created.text} (${created.name}): ${created.filePath}`)
    return created
}

export const getInstalledCustomActionState = (action: CustomAction, scriptsPath: string = getScriptPath()): CustomActionInstallState => {
    const resolvedAction = resolveActionPaths(action, scriptsPath)
    const customAction = findByFilePath(action, resolvedAction.filePath)
    const installedMenu = customAction?.name ? findMenuFor(customAction.name, actionMgr.getMenu()) !== null : false
    const installedToolbar = customAction?.name ? isInstalledToToolbar(action.toolbar, customAction.name) : false

    return {
        action: resolvedAction,
        customAction,
        installedMenu,
        installedToolbar
    }
}

export const applyCustomActionTargets = (action: CustomAction, targets: CustomActionTargets, scriptsPath: string = getScriptPath()) => {
    const resolvedAction = resolveActionPaths(action, scriptsPath)
    const shouldInstall = targets.menu || targets.toolbar

    if (!shouldInstall) {
        removeCustomActionTargets(action, { menu: true, toolbar: true }, scriptsPath)
        return
    }

    const customAction = createOrUpdateCustomAction(action, resolvedAction)

    if (targets.menu && action.menuPath) {
        addToMenu(customAction)
    }

    if (targets.toolbar && action.toolbar) {
        addToToolbar(customAction)
    }
}

export const removeCustomActionTargets = (action: CustomAction, targets: CustomActionTargets, scriptsPath: string = getScriptPath()) => {
    const resolvedAction = resolveActionPaths(action, scriptsPath)
    const matches = findAllByFilePath(action, resolvedAction.filePath)

    if (matches.length === 0) return

    matches.forEach((match) => {
        const installedMenu = match.name ? findMenuFor(match.name, actionMgr.getMenu()) !== null : false
        const installedToolbar = match.name ? isInstalledToToolbar(action.toolbar, match.name) : false

        if (!match.name) return

        if (targets.menu && installedMenu) {
            removeFromMenu(match.name)
        }

        if (targets.toolbar && installedToolbar) {
            removeFromToolbar(action.toolbar, match.name)
        }

        const menuStillInstalled = !targets.menu && installedMenu
        const toolbarStillInstalled = !targets.toolbar && installedToolbar

        if (!menuStillInstalled && !toolbarStillInstalled) {
            removeUnderlyingCustomAction(match.name)
        }
    })
}

export const installCustomActions = (actions: CustomAction[]) => {
    const scriptsPath = getScriptPath()
    debug(`Script path: ${scriptsPath}`)
    const menuPaths = array.group(actions, (a => a.menuPath ?? ""))
    progress('Installing', keys(menuPaths), (menuPath) => {
        const groupedActions = menuPaths[menuPath] as CustomAction[]
        const groups = array.group(groupedActions, (action) => action.group ?? "")
        keys(groups).forEach(group => {
            groups[group].forEach(action => {
                applyCustomActionTargets(action, {
                    menu: Boolean(action.menuPath),
                    toolbar: Boolean(action.toolbar)
                }, scriptsPath)
            })
        })
    })
}

export const uninstallCustomActions = (actions: CustomAction[]) => {
    debug(`Uninstalling Actions`)
    const toolbarNames = new CustomSet<string>()

    actions.forEach(action => {
        if (!action) return
        if (action.toolbar) toolbarNames.add(action.toolbar)
        removeCustomActionTargets(action, { menu: true, toolbar: true })
    })

    toolbarNames.forEach(toolbarName => {
        const toolbar = paneMgr.findToolBar(toolbarName)
        if (!toolbar) {
            debug(`Toolbar ${toolbarName} not found for post-uninstall cleanup`)
            return
        }
        toolbar.clear()
        toolbar.setClosed(true)
        paneMgr.removeToolBar(toolbarName)
        debug(`Toolbar ${toolbarName} cleared, closed, and removed after uninstall`)
    })
}
