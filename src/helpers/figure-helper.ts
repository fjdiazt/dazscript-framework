export const resolveFigureNode = (node: DzNode | null): DzSkeleton | null => {
    if (!node) return null
    if (node.inherits('DzSkeleton')) return node as DzSkeleton
    return node.getSkeleton?.() ?? null
}

export const getFigureResolutionLevel = (figure: DzNode): number | null => {
    const property = getFigureResolutionProperty(figure)
    return property ? property.getValue() : null
}

export const setFigureResolutionLevel = (figure: DzNode, resolution: number): boolean => {
    const property = getFigureResolutionProperty(figure)
    if (!property) return false

    property.setValue(resolution)
    return true
}

const getFigureResolutionProperty = (figure: DzNode): DzEnumProperty | null => {
    const shape = figure.getObject()?.getCurrentShape()
    return shape?.findProperty('lodlevel') as DzEnumProperty | null
}
