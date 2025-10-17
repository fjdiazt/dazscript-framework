import { app, sceneHelper } from '@dsf/core/global';
import { TreeNode } from '@dsf/lib/tree-node';
import { find, group } from './array-helper';
import { entries } from './record-helper';
import { getSelectedPropertyGroups } from './scene-helper';
import { contains } from './string-helper';

export enum NamedAxis {
    Bend = 'Bend',
    Twist = 'Twist',
    SideSide = 'Side-Side',
    FrontBack = 'Front-Back',
    UpDown = 'Up-Down',
}

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
    return assetMgr.isHairType(type) || contains(type.valueOf(), 'Hair')
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

export const getRotations = (node: DzNode, includeExtraRotations: boolean = true): DzFloatProperty[] => {
    if (!node) return [];

    const xRotate = sceneHelper.findPropertyOnNode('XRotate', node) as DzFloatProperty;
    const xRotate2 = sceneHelper.findPropertyOnNode('XRotate2', node) as DzFloatProperty;
    const yRotate = sceneHelper.findPropertyOnNode('YRotate', node) as DzFloatProperty;
    const yRotate2 = sceneHelper.findPropertyOnNode('YRotate2', node) as DzFloatProperty;
    const zRotate = sceneHelper.findPropertyOnNode('ZRotate', node) as DzFloatProperty;
    const zRotate2 = sceneHelper.findPropertyOnNode('ZRotate2', node) as DzFloatProperty;

    if (includeExtraRotations) {
        return [xRotate, xRotate2, yRotate, yRotate2, zRotate, zRotate2].filter(Boolean);
    }

    // Prefer Rotate2 if available, otherwise fallback to Rotate
    return [
        xRotate2 ?? xRotate,
        yRotate2 ?? yRotate,
        zRotate2 ?? zRotate
    ].filter(Boolean);
}

export const getRotationsForAxis = (node: DzNode, axis: 'x' | 'y' | 'z'): DzFloatProperty => {
    debug(`Getting rotation property for axis: ${axis} on node: ${node.getName()} - isBone: ${isBone(node)}`);

    let prop: DzFloatProperty | undefined;

    if (isBone(node)) {
        prop = getNamedRotationForAxis(node, axis);
        if (!prop) {
            debug(`Named rotation not found for ${axis} on bone ${node.getName()}, falling back to generic search`);
        }
    }

    if (!prop) {
        prop = find(
            getRotations(node, false),
            (rotation) => rotation.getName().valueOf()[0].toLowerCase() === axis
        ) as DzFloatProperty;
    }

    return prop;
}

export const getNamedRotations = (node: DzNode): DzFloatProperty[] => {
    const rotations: DzFloatProperty[] = []

    for (let namedAxis in NamedAxis) {
        let property = sceneHelper.findPropertyOnNodeByLabel(NamedAxis[namedAxis], node) as DzFloatProperty
        if (property) rotations.push(property)
    }

    return rotations
}

export const getRotationAxisFor = (node: DzNode, axis: NamedAxis): string => {
    const rotations = getNamedRotations(node)
    if (!rotations) return null

    for (let rotation of rotations) {
        if (rotation.getLabel() == axis) {
            const axis = rotation.getName().valueOf()[0].toLowerCase()
            return axis
        }
    }

    return null
}

export const getNamedRotationForAxis = (node: DzNode, axis: 'x' | 'y' | 'z'): DzFloatProperty | null => {
    const rotations = getNamedRotations(node)
    if (!rotations) return null

    for (let rotation of rotations) {
        if (rotation.getName().valueOf()[0].toLowerCase() == axis) {
            return rotation
        }
    }

    return null
}

export const getTranslations = (node: DzNode): DzFloatProperty[] => {
    return !node ? [] : [node.getXPosControl(), node.getYPosControl(), node.getZPosControl()];
}

export const getScales = (node: DzNode): DzFloatProperty[] => {
    return [node.getXScaleControl(), node.getYScaleControl(), node.getZScaleControl(), node.getScaleControl()];
}

export const getPropertiesFromSelectedGroup = (nodes: DzNode[], recursive: boolean = false, traverse: boolean = false, pane?: DzAbstractNodeEditorPane): DzProperty[] => {
    var properties: DzProperty[] = [];
    var propertyGroups = getSelectedPropertyGroups(pane);

    nodes.forEach(node => {
        propertyGroups.forEach(path => {
            properties.push(...getPropertiesInPath(node, path, recursive, traverse));
        });
    });

    return properties;
}

/**
 * A function for getting the list properties for an element
 * @param node
 * @param path
 * @param recursive
 * @returns
 */
export const getPropertiesInPath = (node: DzNode, path: string, recursive: boolean, traverse: boolean = false): DzProperty[] => {
    if (!path) return getProperties(node);

    var groupTree = node.getPropertyGroups();
    var propertyGroup: DzPropertyGroup;
    var name = "";
    var index = -1;
    var subPath = path;

    while (!subPath.isEmpty()) {
        index = subPath.indexOf("/");
        if (index < 0) {
            name = subPath;
            subPath = "";
        }
        else {
            name = subPath.left(index);
            subPath = subPath.right(subPath.length - index - 1);
        }
        propertyGroup = propertyGroup ? propertyGroup.findChild(name) : groupTree.findChild(name);

        if (propertyGroup === null) break;
    }

    return getPropertiesInGroup(propertyGroup, traverse, recursive);
}

const getPropertiesInGroup = (group: DzPropertyGroup, traverse: boolean, recursive: boolean): DzProperty[] => {
    var properties: DzProperty[] = [];

    if (!group) return properties;

    var propertiesCount = group.getNumProperties();

    properties = new Array(propertiesCount);

    for (var i = 0; i < propertiesCount; i += 1) {
        properties[i] = group.getProperty(i);
    }

    // If we are recursing
    if (recursive) {
        // Concatenate the properties array from child groups
        properties = properties.concat(
            getPropertiesInGroup(group.getFirstChild(), true, recursive));
    }

    // If we are traversing
    if (traverse) {
        // Concatenate the properties array from sibling groups
        properties = properties.concat(
            getPropertiesInGroup(group.getNextSibling(), traverse, recursive));
    }

    return properties;
}

/**
 * Method for building a bounding box; optionally excluding a node and/or its children
 * @param node
 * @param excludeBase
 * @param excludeChildren
 * @param recursive
 * @returns
 * http://docs.daz3d.com/doku.php/public/software/dazstudio/4/referenceguide/scripting/api_reference/samples/core/frame_camera/start
 */
export const buildBoundingBox = (node: DzNode, excludeBase: boolean, excludeChildren: boolean, recursive: boolean): DzBox3 => {
    var boxBounding = new DzBox3();
    var g_oArrayHelper = new DzArrayHelper();

    if (!node) return null;

    // Define an array of nodes to exclude
    var aExcludeNodes = (excludeChildren ? node.getNodeChildren(recursive) : []);

    // If we're excluding the base node
    if (excludeBase) {
        // Add the base node to the front of the list
        aExcludeNodes.unshift(node);
    }

    // Declare working variable
    var boxNode: DzBox3;

    // Define a flag to indicate whether the box grows
    var bHasGrown = false;

    // Get whether a node is selected
    var bSelectedNode = (Scene.getPrimarySelection() != undefined);
    // Get the number of nodes to process
    var nNodes = (bSelectedNode ? Scene.getNumSelectedNodes() : Scene.getNumNodes());
    // Iterate over the nodes
    for (var i = 0; i < nNodes; i += 1) {
        // Get the 'current' node; based on selection
        var oNode = (bSelectedNode ? Scene.getSelectedNode(i) : Scene.getNode(i));
        // If we have a node and it is not in the exclude list
        if (oNode && g_oArrayHelper.isInArray(aExcludeNodes, oNode) < 0) {
            // Get the world space bounding box
            boxNode = oNode.getWSBoundingBox();
            // Grow our box to include the node box
            boxBounding.include(boxNode.max);
            boxBounding.include(boxNode.min);
            // Update the flag
            bHasGrown = true;
        }
    }

    // If the box has not grown
    if (!bHasGrown) {
        // We're done here...
        return undefined;
    }

    // Return the bounding box
    return boxBounding;

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
