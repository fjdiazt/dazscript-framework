import { mainWindow } from '@dsf/core/global'

export const selectUniversalRotateTool = (coordinateSpace?: number): DzUniversalRotateTool => {
    const viewportMgr = mainWindow.getViewportMgr()
    const tool = viewportMgr.findTool('DzUniversalRotateTool') as DzUniversalRotateTool
    viewportMgr.setActiveTool(tool)
    if (coordinateSpace) tool.setCoordinateSpace(coordinateSpace)
    return tool
}

export const getAuxViewport = (): DzViewport | null => {
    const viewportMgr = mainWindow.getViewportMgr()
    for (let i = 0; i < viewportMgr.getNumViewports(); i++) {
        const viewport = viewportMgr.getViewport(i)
        if (viewport.name === 'AuxViewportView') return viewport
    }
    return null
}