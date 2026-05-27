export type PrimitiveKind = 'Sphere' | 'Cube' | 'Cone' | 'Plane' | 'Torus' | 'Cylinder'

export type CreatePrimitiveOptions = {
    kind: PrimitiveKind
    name?: string
    label?: string
    size?: number
}

export type CreatePrimitiveResult = {
    ok: boolean
    node: DzNode | null
    message: string
}

declare const Geometry: DzGeometryUtil | undefined

export const createPrimitive = (options: CreatePrimitiveOptions): CreatePrimitiveResult => {
    const geometryUtil = getGeometryUtil()
    if (!geometryUtil) {
        return { ok: false, node: null, message: 'Global Geometry utility is not available' }
    }

    const primitiveType = getPrimitiveType(geometryUtil, options.kind)
    if (primitiveType === null) {
        return { ok: false, node: null, message: `Unsupported primitive kind: ${options.kind}` }
    }

    const settings = new DzSettings()
    geometryUtil.getDefaultPrimitiveOptions(primitiveType, settings)

    if (typeof options.size === 'number' && isFinite(options.size) && options.size > 0) {
        settings.setFloatValue('size', options.size)
    }

    const node = geometryUtil.createPrimitive(settings)
    if (!node) {
        return { ok: false, node: null, message: `DzGeometryUtil did not create a ${options.kind}` }
    }

    if (options.name) node.setName(options.name)
    if (options.label) node.setLabel(options.label)
    if (!isNodeInScene(node)) Scene.addNode(node)

    return { ok: true, node, message: '' }
}

const getGeometryUtil = (): DzGeometryUtil | null =>
    typeof Geometry !== 'undefined' ? Geometry : null

const getPrimitiveType = (geometryUtil: DzGeometryUtil, kind: PrimitiveKind): number | null => {
    const primitiveTypes = geometryUtil as any
    if (kind === 'Sphere') return primitiveTypes.Sphere
    if (kind === 'Cube') return primitiveTypes.Cube
    if (kind === 'Cone') return primitiveTypes.Cone
    if (kind === 'Plane') return primitiveTypes.Plane
    if (kind === 'Torus') return primitiveTypes.Torus
    if (kind === 'Cylinder') return primitiveTypes.Cylinder
    return null
}

const isNodeInScene = (node: DzNode): boolean => {
    for (let i = 0; i < Scene.getNumNodes(); i++) {
        if (Scene.getNode(i) === node) return true
    }
    return false
}
