import { mainWindow } from '@dsf/lib/global'

export const selectUniversalRotateTool = (coordinateSpace?: number): DzUniversalRotateTool => {
    const viewportMgr = mainWindow.getViewportMgr()
    const tool = viewportMgr.findTool('DzUniversalRotateTool') as DzUniversalRotateTool
    viewportMgr.setActiveTool(tool)
    if (coordinateSpace) tool.setCoordinateSpace(coordinateSpace)
    return tool
}