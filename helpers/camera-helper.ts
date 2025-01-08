import * as global from '@dsf/lib/global'
import { mainWindow } from '@dsf/lib/global';

export const getActiveCamera = (): DzCamera => {
    return mainWindow.getViewportMgr().getActiveViewport().get3DViewport().getCamera()
}

export const setActiveCamera = (camera: DzCamera) => {
    mainWindow.getViewportMgr().getActiveViewport().get3DViewport().setCamera(camera);
}

export const getPerspectiveCamera = (): DzCamera => {
    return mainWindow.getViewportMgr().getViewCamera(DzCamera.PERSPECTIVE_CAM)
}