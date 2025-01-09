import { mainWindow } from '@dsf/core/global'

const findPane = <T extends DzPane>(className: string): T => {
    return mainWindow.getPaneMgr().findPane(className) as T
}

export const getSmartContentPane = (): DzSmartContentPane => {
    return <DzSmartContentPane>findPane("DzSmartContentPane")
}

export const getSurfacesPane = (): DzSurfacesPane => {
    return findPane<DzSurfacesPane>("DzSurfacesPane")
}

export const getAuxViewPort = (): DzAuxViewportPane => {
    return findPane<DzAuxViewportPane>("DzAuxViewportPane")
}

export const getParametersPane = (): DzParametersPane => {
    return findPane<DzParametersPane>("DzParametersPane")
}