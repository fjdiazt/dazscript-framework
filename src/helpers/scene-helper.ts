import { scene } from '@dsf/core/global'
import { contains, distinct, group } from './array-helper'
import { getRoot, isFigure } from './node-helper'
import { getPaneNodeEditor, getParametersPane, getParametersPaneNodeEditor } from './pane-helper'

export const getSelectedOf = <T>(typeName: string): DzNode[] => {
    let nodes = []
    for (let node of scene.getSelectedNodeList()) {
        if (!node.inherits(typeName)) continue
        nodes.push(node)
    }
    return nodes
}

export const getSelectedNode = (): DzNode | null => {
    if (scene.getNumSelectedNodes() === 0) return null
    return scene.getPrimarySelection()
}

export const getTopParent = (node: DzNode): DzNode => {
    var parent = node.getNodeParent();
    return parent ? getTopParent(parent) : node;
}

export const getParentFigure = (node: DzNode): DzSkeleton | null => {
    if (!node) return null;
    if (isFigure(node)) return node as DzSkeleton;
    return getParentFigure(node.getNodeParent());
}

export const getNodes = (): DzNode[] => {
    return scene.getNodeList()
}

export const getFigures = (): DzSkeleton[] => {
    return distinct(getNodes().map(n => n.getSkeleton?.()), (n => n?.getLabel().valueOf())).filter(n => n !== null)
}

/**
 * Get the selected figure
 * @returns the figure skeleton, or null if there is no current selection or the selected node is not part of a figure
 */
export const getSelectedFigure = (): DzSkeleton | null => {
    return getSelectedNode()?.getSkeleton?.()
}

/**
 * Given the selected nodes in the scene, return the figures they are part of
 * @returns the selected figures
 */
export const getSelectedFigures = (): DzSkeleton[] => {
    let nodes: DzSkeleton[] = []
    for (let node of scene.getSelectedNodeList()) {
        let skeleton = node.getSkeleton?.()
        if (!skeleton || contains(nodes, node)) continue
        nodes.push(skeleton)
    }
    return nodes
}

export const getSelectedNodes = (): DzNode[] => {
    return scene.getSelectedNodeList()
}

export const getSelectedRoot = (): DzNode => {
    return getRoot(getSelectedNode())
}

export const getSelectedRoots = (): DzNode[] => {
    return distinct(getSelectedNodes().map(n => getRoot(n)))
}

export const getSelectedProperties = (): DzProperty[] => {
    return getParametersPane()?.getNodeEditor()?.getPropertySelections(true) ?? []
}

export const getSelectedNumericProperties = (): (DzFloatProperty | DzIntProperty | DzBoolProperty)[] => {
    return getParametersPane()?.getNodeEditor()?.getPropertySelections(true).map(p => p as DzFloatProperty | DzIntProperty | DzBoolProperty) ?? []
}

export const getSelectedPropertiesOfType = <TProperty extends DzProperty>(type: string): TProperty[] => {
    return getSelectedProperties().filter(p => p.inherits(type)) as TProperty[]
}

export const getSelectedPropertiesOfTypes = <TProperty extends DzProperty>(types: string[]): TProperty[] => {
    return getSelectedProperties().filter(p => types.some(type => p.inherits(type))) as TProperty[]
}

export const getSelectedPropertyGroups = (pane?: DzAbstractNodeEditorPane): string[] => {
    var propertyGroups: string[] = [];
    var paneNodeEditor = pane ? getPaneNodeEditor(pane) : getParametersPaneNodeEditor();

    var selectedProperties = paneNodeEditor?.getPropertySelections(true)
    if (selectedProperties.length == 0)
        selectedProperties = paneNodeEditor?.getPropertySelections(false)

    if (selectedProperties.length == 0)
        return propertyGroups

    var pathsGroup = group<DzProperty, string>(selectedProperties, p => p.getPath().valueOf().substr(1) + "/")
    propertyGroups = Object.keys(pathsGroup)

    return propertyGroups
}

export const clearSelection = () => {
    for (let node of scene.getSelectedNodeList()) {
        node.select(false)
    }
}

export const currentTime = (): DzTime => {
    return scene.getTime()
}

/**
 * @returns the current frame number (0-based)
 */
export const getCurrentFrame = (): number => {
    return scene.getTime().valueOf() / scene.getTimeStep().valueOf()
}

export const getEndFrame = (): number => {
    return scene.getAnimRange().end / scene.getTimeStep().valueOf()
}

/**
 * @deprecated Use getEndFrame
 * @returns the last frame number (0-based)
 */
export const getLastFrame = (): number => {
    return scene.getAnimRange().end / scene.getTimeStep().valueOf()
}

export const timeToFrame = (time: DzTime): number => {
    return time.valueOf() / scene.getTimeStep().valueOf()
}

export const frameToTime = (frame: number): DzTime => {
    return new DzTime(scene.getTimeStep().valueOf() * frame)
}