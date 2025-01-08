
export const getModifiers = (figure: DzSkeleton): DzModifier[] => {
    let modifiers: DzModifier[] = []
    let obj = figure.getObject()

    for (let i = 0; i < obj.getNumModifiers(); i++) {
        modifiers.push(obj.getModifier(i))
    }

    return modifiers
}

export const getMirrorNodes = (figure: DzSkeleton, nodes: DzNode[]): DzNode[] => {
    let mirrorNodes: DzNode[] = []

    nodes.forEach((node) => {
        const name = node.getName().valueOf()
        let prefix = name[0]
        if (prefix !== 'r' && prefix !== 'l') return
        prefix = prefix === 'r' ? 'l' : 'r'
        const mirrorName = `${prefix}${name.substring(1)}`
        const mirrorNode = figure.findNodeChild(mirrorName, true)
        if (mirrorNode) mirrorNodes.push(mirrorNode)
    })

    return mirrorNodes
}