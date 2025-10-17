import { mainWindow } from '@dsf/core/global';

export const getActiveCamera = (): DzCamera => {
    return mainWindow.getViewportMgr().getActiveViewport().get3DViewport().getCamera()
}

export const setActiveCamera = (camera: string | DzCamera) => {
    mainWindow.getViewportMgr().getActiveViewport().get3DViewport().setCamera(camera);
}

export const getPerspectiveCamera = (): DzCamera => {
    return mainWindow.getViewportMgr().getViewCamera(DzCamera.PERSPECTIVE_CAM)
}