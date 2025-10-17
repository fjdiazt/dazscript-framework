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

export const getAuxViewPortPane = (): DzAuxViewportPane => {
    return findPane<DzAuxViewportPane>("DzAuxViewportPane")
}

export const getParametersPane = (): DzParametersPane => {
    return findPane<DzParametersPane>("DzParametersPane")
}

export const getParametersPaneNodeEditor = (): DzPropertySideNavHierarchy => {
    return findPane<DzParametersPane>("DzParametersPane")?.getNodeEditor() ?? null
}

export const getPaneNodeEditor = (pane: DzAbstractNodeEditorPane): DzPropertySideNavHierarchy => {
    return pane.getNodeEditor ? pane.getNodeEditor() : null
}