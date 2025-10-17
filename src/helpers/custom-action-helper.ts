import { debug } from '@dsf/common/log'
import { CustomAction } from '@dsf/core/custom-action'
import { mainWindow } from '@dsf/core/global'
import * as array from '@dsf/helpers/array-helper'
import { getMenu } from './menu-helper'
import { keys } from './object-helper'
import { progress } from './progress-helper'
import { getScriptPath } from './script-helper'

const actionMgr = mainWindow.getActionMgr()
const paneMgr = mainWindow.getPaneMgr()

export const findByFilePath = (action: CustomAction, filePath: string): CustomAction | null => {
    var actionsCount = actionMgr.getNumCustomActions()
    for (var i = 0; i < actionsCount; i++) {
        var actionFilePath = actionMgr.getCustomActionFile(i)

        if (actionFilePath != filePath) continue

        var name = actionMgr.getCustomActionName(i)
        var text = actionMgr.getCustomActionText(i)
        var desc = actionMgr.getCustomActionDesc(i)
        var icon = actionMgr.getCustomActionIcon(i)

        return {
            name: name.toString(),
            text: text.toString(),
            description: desc.toString(),
            filePath: actionFilePath.toString(),
            icon: icon.toString(),
            menuPath: action.menuPath,
            group: action.group,
            shortcut: action.shortcut,
            sort: action.sort,
            toolbar: action.toolbar
        } as CustomAction
    }

    return null
}

export const findMenuFor = (actionName: string, topMenu?: DzActionMenu): DzActionMenu | null => {
    topMenu = topMenu ?? actionMgr.getMenu()
    if (!topMenu.hasItems()) return null
    for (let i = 0; i < topMenu.getNumItems(); i++) {
        let item = topMenu.getItem(i)
        if (item.type == DzActionMenuItem.CustomAction && item.action == actionName)
            return item.getParentMenu()
        if (item.type == DzActionMenuItem.SubMenu) {
            var subMenu = findMenuFor(actionName, item.getSubMenu())
            if (subMenu) return subMenu
        }
    }
    return null
}

export const findInMenu = (menu: DzActionMenu, actionName: string): DzActionMenuItem | null => {
    var item: DzActionMenuItem

    var aItems = menu.getItemList()
    for (var i = 0; i < aItems.length; i += 1) {
        item = aItems[i]

        if (item.type != DzActionMenuItem.CustomAction) {
            continue
        }

        if (item.action == actionName) {
            return item
        }
    }

    return null
}

export const createCustomAction = (action: CustomAction, update: boolean) => {
    let existingAction = findByFilePath(action, action.filePath)

    if (existingAction && !update) return

    if (existingAction) {
        removeCustomAction(existingAction)
    }

    let name = actionMgr.addCustomAction(String(action.text), String(action.description), String(action.filePath), true, action.shortcut ?? "", String(action.icon)).toString()
    action.name = name

    if (action.shortcut) {
        actionMgr.setCustomActionShortcut(actionMgr.findCustomAction(name), action.shortcut)
        debug(`Created Custom Action: ${action.text} (${action.name}): ${action.filePath}`)
    }

    addToMenu(action)
    addToToolbar(action)
}

export const addToMenu = (action: CustomAction) => {
    if (!action.menuPath) return
    action.menuPath = action.menuPath + '/'
    var menu = getMenu(action.menuPath, true)
    var menuAction = findInMenu(menu, action.name)
    if (menuAction) return
    menu.insertCustomAction(action.name, action.sort ?? -1)
    debug(`Action "${action.text}" added to menu "${menu.getPath()}"`)
}

export const addToToolbar = (action: CustomAction) => {
    if (!action.toolbar) return;

    var toolbar = paneMgr.findToolBar(action.toolbar);

    if (!toolbar) {
        toolbar = paneMgr.createToolBar(action.toolbar);
        toolbar.dock(DzToolBar.ToolBarTop);
    }

    if (array.find(toolbar.getItemList(), i => i.action == action.name)) return

    debug(`Adding menu to toolbar ${toolbar.name}`)
    toolbar.insertCustomAction(action.name, action.sort)
}

const removeCustomAction = (action: CustomAction) => {
    if (!action.name) return
    var menu = findMenuFor(action.name, actionMgr.getMenu())
    if (menu) {
        var menuAction = findInMenu(menu, action.name)
        if (menuAction) {
            menu.removeItem(menuAction)
            debug(`Action ${action.text} Removed from menu`)
        }
    }

    actionMgr.removeCustomAction(actionMgr.findCustomAction(action.name))
    debug(`Action ${action.text} Removed`)
    debug(`Toolbar: ${action.toolbar}`)

    if (!action.toolbar) return
    debug(`Removing Toolbar ${action.toolbar}`)
    var toolbar = paneMgr.findToolBar(action.toolbar)
    if (!toolbar) return
    toolbar.clear()
    // paneMgr.removeToolBar(action.toolbar)
    // debug(`Toolbar Removed`)
}

export const installCustomActions = (actions: CustomAction[]) => {
    uninstallCustomActions(actions)
    let scriptsPath = getScriptPath()
    debug(`Script path: ${scriptsPath}`)
    let menuPaths = array.group(actions, (a => a.menuPath ?? ""))
    progress('Installing', keys(menuPaths), (menuPath) => {
        let actions = menuPaths[menuPath] as CustomAction[]
        let groups = array.group(actions, (action) => action.group ?? "")
        keys(groups).forEach(group => {
            groups[group].forEach(action => {
                action.filePath = `${scriptsPath}/${action.filePath}`
                action.icon = action.icon ? `${scriptsPath}/${action.icon}` : ''
                createCustomAction(action, true)
                // findMenuFor(action.name)
            })
        })
    })
}

export const uninstallCustomActions = (actions: CustomAction[]) => {
    debug(`Uninstalling Actions`)
    actions.forEach(action => {
        if (!action) return
        let customAction = findByFilePath(action, `${getScriptPath()}/${action.filePath}`)
        if (!customAction) return
        debug(`Uninstalling action "${customAction.text} (${customAction.name})"`)
        removeCustomAction(customAction)
    })
}

