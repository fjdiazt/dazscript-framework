import { app, sceneHelper } from '@dsf/core/global';
import { TreeNode } from '@dsf/lib/tree-node';
import { group } from './array-helper';
import { entries } from './record-helper';

export const isBone = (node: DzNode): boolean => {
    return node.iskindof('DzBone')
}

export const isFigure = (node: DzNode): boolean => {
    return node.iskindof('DzSkeleton')
}

/**
 * Returns the root of a node
 * @param node
 * @returns The root of the node, if the node is part of a figure, return the figure (skeleton) otherwise return the node itself
 */
export const getRoot = (node: DzNode): DzNode => {
    if (node && node.className() === "DzBone" && node.getSkeleton)
        return node.getSkeleton();
    else
        return node;
}

export const getFigure = (node: DzNode): DzSkeleton | null => {
    return node.getSkeleton?.() ?? null
}

/**
 * Find a property by the given name or internal name
 * @param node the node to search on
 * @param name the name or internal name of the property
 * @returns The first property with the given name or internal name, or NULL.
 */
export const findProperty = <T extends DzProperty = DzProperty>(node: DzNode, name: string): T | null => {
    return sceneHelper.findPropertyOnNode(name, node) as T
        ?? sceneHelper.findPropertyOnNodeByInternalName(name, node) as T
}

/**
 * Get all properties associated with the node.
 * @param node The node to get the properties from.
 * @param includeModifiers Whether or not to include the properties of DzModifiers.
 * @returns All properties associated with the node.
 */
export const getProperties = (node: DzNode, includeModifiers: boolean = false): DzProperty[] => {
    return sceneHelper.getPropertiesOnNode(node, includeModifiers)
}

export const getChildren = (node: DzNode, recursive: boolean, includeParented?: boolean, includeFittedTo?: boolean) => {
    return node.getNodeChildren(recursive ?? false).filter(n =>
        includeParented || isBodyPartOf(n, node.getSkeleton())
        && (includeFittedTo || !isFitting(getFigure(n), node)))
}

/**
 * Returns true if the specified node is a body part of a figure
 * @param node
 * @param figure
 * @returns
 */
export const isBodyPartOf = (node: DzNode, figure: DzSkeleton): boolean => {
    return isBone(node) && isChildOf(node, figure) && node.getSkeleton()?.getLabel() == figure.getSkeleton()?.getLabel()
}

/**
 * Returns true if the specified node is parented or a body part of a figure
 * @param node
 * @param figure
 * @returns
 */
export const isChildOf = (node: DzNode, figure: DzNode): boolean => {
    return node.isNodeDescendantOf(figure, true)
}

/**
 * Get the fitting target of the node
 * @param node
 * @returns the fitting target (skeleton) of the node or null
 */
export const getFittingTarget = (node: DzNode): DzSkeleton | null => {
    return getRoot(node).getSkeleton()?.getFollowTarget()
}

/**
* Returns true if the node is fitted to another node (eg: it's a clothing item)
* @param figure
* @param target if specified, check if the node is fitted to the target node, otherwise check if the node is fitted to any other node
* @returns true if the node is fitted to another node
*/
export const isFitting = (figure: DzSkeleton, target?: DzNode): boolean => {
    return target
        ? figure?.getFollowTarget() == target
        : figure?.getFollowTarget() != null
}

export const isClothingType = (node: DzNode): boolean => {
    if (!isFigure(node)) return false
    const figure = getFigure(node)!
    const assetMgr = app.getAssetMgr()
    const type = assetMgr.getTypeForNode(figure)
    return assetMgr.isClothingType(type) || type === 'Follower'
}

export const isHairType = (node: DzNode): boolean => {
    if (!isFigure(node)) return false
    const figure = getFigure(node)!
    const assetMgr = app.getAssetMgr()
    const type = assetMgr.getTypeForNode(figure)
    return assetMgr.isHairType(type)
}

export const isGeoShell = (node: DzNode): boolean => {
    return node.inherits('DzGeometryShellNode')
}

export const getTransforms = (node: DzNode, include: { rotations?: boolean, translations?: boolean, scale?: boolean }) => {
    let transforms: DzFloatProperty[] = []

    if (include.rotations === true) transforms = getRotations(node)
    if (include.translations === true) transforms = transforms.concat(getTranslations(node))
    if (include.scale === true) transforms = transforms.concat(getScales(node))

    return transforms
}

export const getRotations = (node: DzNode): DzFloatProperty[] => {
    if (!node) return [];

    const xRotate = (sceneHelper.findPropertyOnNode('XRotate2', node)
        ?? sceneHelper.findPropertyOnNode('XRotate', node)) as DzFloatProperty
    const yRotate = (sceneHelper.findPropertyOnNode('YRotate2', node)
        ?? sceneHelper.findPropertyOnNode('YRotate', node)) as DzFloatProperty
    const zRotate = (sceneHelper.findPropertyOnNode('ZRotate2', node)
        ?? sceneHelper.findPropertyOnNode('ZRotate', node)) as DzFloatProperty

    return [xRotate, yRotate, zRotate];
}

export const getTranslations = (node: DzNode): DzFloatProperty[] => {
    return !node ? [] : [node.getXPosControl(), node.getYPosControl(), node.getZPosControl()];
}

export const getScales = (node: DzNode): DzFloatProperty[] => {
    return [node.getXScaleControl(), node.getYScaleControl(), node.getZScaleControl(), node.getScaleControl()];
}

export const getPropertiesTree = <T = DzProperty>(node: DzNode, map?: (property: DzProperty) => T, filter?: (property: DzProperty) => boolean, showProgress: boolean = false): TreeNode<T>[] => {
    if (showProgress) startProgress(`Collecting Properties`, 3)
    let root: TreeNode<T>;

    // Fetch properties and group them by their path
    const properties = sceneHelper.getPropertiesOnNode(node);
    if (showProgress) stepProgress()

    const grouped = group(properties, (p) => p.getPath());
    if (showProgress) stepProgress()

    // Root TreeNode
    root = new TreeNode<T>('root', '');
    const pathMap: Record<string, TreeNode<T>> = { '': root };

    // Process grouped entries
    const groupedEntries = entries(grouped);
    if (showProgress) stepProgress()

    if (showProgress) startProgress(`Processing ${groupedEntries.length} properties`, groupedEntries.length)
    for (const [path, props] of groupedEntries) {
        const paths = path.split('/');
        let currentPath = '';

        // Create nodes for the path hierarchy
        for (let i = 0; i < paths.length; i++) {
            currentPath = paths.slice(0, i + 1).join('/');
            if (!pathMap[currentPath]) {
                const newNode = new TreeNode<T>(paths[i], currentPath);
                pathMap[currentPath] = newNode;

                if (i > 0) {
                    const parentPath = paths.slice(0, i).join('/');
                    const parentNode = pathMap[parentPath];
                    parentNode?.addChild(newNode);
                    newNode.parent = parentNode;
                }
            }
        }

        // Add property nodes to the current path
        const currentNode = pathMap[path];
        if (currentNode) {
            for (const property of props) {
                if (filter && !filter(property)) continue
                const newNode = new TreeNode<T>(
                    property.getLabel(),
                    property.getPath(),
                    map?.(property) ?? (property as T)
                );
                currentNode.addChild(newNode);
                newNode.parent = currentNode;
            }
        }
        if (showProgress) stepProgress()
    }
    if (showProgress) finishProgress()
    if (showProgress) finishProgress()

    // Return root children or an empty array if none exist
    return root.children.length > 0 ? root.children : [];
};

export const getPropertiesPathsTree = (node: DzNode): TreeNode<string>[] => {
    let items = entries(group(sceneHelper.getPropertiesOnNode(node), (p) => p.getPath())).map(x => ({ path: x[0], properties: x[1] }))

    const root = new TreeNode<string>('root', '')
    const pathMap: { [key: string]: TreeNode<string> } = { '': root }

    items.forEach(element => {
        const paths = element.path.split('/')
        let currentPath = ''

        paths.forEach((path, index) => {
            currentPath += `${index === 0 ? '' : '/'}${path}`
            if (!pathMap[currentPath]) {
                const newNode = new TreeNode<string>(path, currentPath)
                pathMap[currentPath] = newNode

                if (index !== 0) {
                    const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'))
                    const parentNode = pathMap[parentPath]
                    parentNode?.addChild(newNode)
                    newNode.parent = parentNode
                }
            }
        })
    })

    const rootChildren = pathMap[''].children
    return rootChildren && rootChildren.length > 0 ? rootChildren : root.children
}
