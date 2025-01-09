import { mainWindow } from '@dsf/core/global'

const actionMgr = mainWindow.getActionMgr()
const paneMgr = mainWindow.getPaneMgr()

export const getMenu = (menuPath: string, createIfNotFound: boolean): DzActionMenu => {
    var index = menuPath.indexOf("::")
    var hasPaneDelimiter = index >= 0

    // TODO: Check what a path delimiter is and how to use it
    if (hasPaneDelimiter) {
        var paneClass = menuPath.substring(0, index)
        var paneManager = paneMgr.findPane(paneClass)
        if (paneManager) {
            var menu = paneManager.getOptionsMenu();
            var subMenu = menuPath.substring(index + 2)
            // Get/Create the sub menu
            return createIfNotFound
                ? menu.findOrCreateSubMenu(subMenu)
                : menu.findSubMenu(subMenu);
        }
    }
    else {
        // Get/Create the sub menu
        return createIfNotFound
            ? actionMgr.getMenu().findOrCreateSubMenu(menuPath)
            : actionMgr.getMenu().findSubMenu(menuPath)
    }
}