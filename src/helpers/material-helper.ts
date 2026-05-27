export type SimpleMaterialOptions = {
    color: Color
    opacity: number
    name?: string
}

export const applySingleMaterial = (node: DzNode, options: SimpleMaterialOptions): boolean => {
    const shape = node.getObject()?.getCurrentShape()
    if (!shape) return false

    if (shape.getNumMaterials() < 1) {
        shape.createMaterial(options.name ?? 'Material')
    }

    let applied = false
    for (let i = 0; i < shape.getNumMaterials(); i++) {
        const material = shape.getMaterial(i)
        if (!material) continue
        applyMaterialValues(material, options)
        applied = true
    }

    return applied
}

const applyMaterialValues = (material: DzMaterial, options: SimpleMaterialOptions): void => {
    const anyMaterial = material as any
    if (options.name && typeof anyMaterial.setName === 'function') {
        anyMaterial.setName(options.name)
    }

    material.setDiffuseColor(options.color)
    material.setBaseOpacity(clampOpacity(options.opacity))

    if (typeof anyMaterial.setOpacity === 'function') {
        anyMaterial.setOpacity(clampOpacity(options.opacity))
    }
}

const clampOpacity = (opacity: number): number => {
    if (!isFinite(opacity) || isNaN(opacity)) return 0.25
    return Math.max(0, Math.min(1, opacity))
}
