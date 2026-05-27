export const collectSceneNodeIds = (): number[] => {
    const ids: number[] = []
    for (let i = 0; i < Scene.getNumNodes(); i++) {
        ids.push(Scene.getNode(i).elementID)
    }
    return ids
}

export const getNodesAddedAfter = (beforeIds: number[]): DzNode[] => {
    const nodes: DzNode[] = []
    for (let i = 0; i < Scene.getNumNodes(); i++) {
        const node = Scene.getNode(i)
        if (beforeIds.indexOf(node.elementID) < 0) nodes.push(node)
    }
    return nodes
}

export const removeNodesByNameOrLabelPrefix = (prefix: string): number => {
    const nodes: DzNode[] = []

    for (let i = 0; i < Scene.getNumNodes(); i++) {
        const node = Scene.getNode(i)
        if (startsWith(String(node.getName()), prefix) || startsWith(String(node.getLabel()), prefix)) {
            nodes.push(node)
        }
    }

    for (let i = 0; i < nodes.length; i++) {
        Scene.removeNode(nodes[i])
        nodes[i].deleteLater?.()
    }

    return nodes.length
}

const startsWith = (value: string, prefix: string): boolean =>
    value.substr(0, prefix.length) === prefix
