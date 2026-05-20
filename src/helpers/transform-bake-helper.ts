import { adjust } from './numeric-property-helper'
import { getPropertyOutputs } from './property-helper'

export type TransformBakeOptions = {
    rotations?: boolean
    translations?: boolean
    scale?: boolean
    maxDepth?: number
}

export type TransformBakePlan = {
    resetProperties: DzProperty[]
    capturedProperties: TransformBakeProperty[]
}

type TransformBakeProperty = DzFloatProperty | DzIntProperty | DzBoolProperty

type CapturedPropertyValue = {
    property: TransformBakeProperty
    value: number
}

const DEFAULT_MAX_DEPTH = 10

const hasProperty = (properties: DzProperty[], property: DzProperty): boolean => {
    for (let index = 0; index < properties.length; index++) {
        if (properties[index] === property) return true
    }

    return false
}

const isTransformBakeProperty = (property: DzProperty): property is TransformBakeProperty => {
    return property.inherits('DzFloatProperty') || property.inherits('DzIntProperty') || property.inherits('DzBoolProperty')
}

const getPropertyName = (property: DzProperty): string => {
    const getName = (property as any).getName
    if (typeof getName === 'function') return String(getName.call(property))

    return String((property as any).name ?? '')
}

const getPropertyPath = (property: DzProperty): string => {
    const getPath = (property as any).getPath
    if (typeof getPath === 'function') return String(getPath.call(property))

    return ''
}

const isRotationProperty = (property: DzProperty): boolean => {
    const name = getPropertyName(property)
    return getPropertyPath(property) === '/General/Transforms/Rotation'
        || name === 'XRotate'
        || name === 'YRotate'
        || name === 'ZRotate'
}

const isTranslationProperty = (property: DzProperty): boolean => {
    const name = getPropertyName(property)
    return getPropertyPath(property) === '/General/Transforms/Translation'
        || name === 'XTranslate'
        || name === 'YTranslate'
        || name === 'ZTranslate'
}

const isScaleProperty = (property: DzProperty): boolean => {
    const name = getPropertyName(property)
    return getPropertyPath(property) === '/General/Transforms/Scale'
        || name === 'Scale'
        || name === 'XScale'
        || name === 'YScale'
        || name === 'ZScale'
}

const shouldCaptureProperty = (property: DzProperty, options: TransformBakeOptions): boolean => {
    return (options.rotations === true && isRotationProperty(property))
        || (options.translations === true && isTranslationProperty(property))
        || (options.scale === true && isScaleProperty(property))
}

const collectRecursiveOutputProperties = (property: DzProperty, maxDepth: number): DzProperty[] => {
    const outputs: DzProperty[] = []
    const queue: DzProperty[] = [property]
    const depths: number[] = [0]

    for (let queueIndex = 0; queueIndex < queue.length; queueIndex++) {
        const driver = queue[queueIndex]
        const depth = depths[queueIndex]
        if (depth >= maxDepth) continue

        const relations = getPropertyOutputs(driver)
        for (let relationIndex = 0; relationIndex < relations.length; relationIndex++) {
            const output = relations[relationIndex].property
            if (!output) continue
            if (hasProperty(outputs, output)) continue

            outputs.push(output)
            if (!hasProperty(queue, output)) {
                queue.push(output)
                depths.push(depth + 1)
            }
        }
    }

    return outputs
}

export const collectTransformBakePlan = (property: DzProperty, options: TransformBakeOptions): TransformBakePlan => {
    const outputs = collectRecursiveOutputProperties(property, options.maxDepth ?? DEFAULT_MAX_DEPTH)
    const capturedProperties: TransformBakeProperty[] = []

    for (let index = 0; index < outputs.length; index++) {
        const output = outputs[index]
        if (!isTransformBakeProperty(output)) continue
        if (!shouldCaptureProperty(output, options)) continue

        capturedProperties.push(output)
    }

    return {
        resetProperties: [property].concat(outputs),
        capturedProperties
    }
}

const captureValues = (properties: TransformBakeProperty[]): CapturedPropertyValue[] => {
    const values: CapturedPropertyValue[] = []

    for (let index = 0; index < properties.length; index++) {
        const property = properties[index]
        values.push({ property, value: (property as any).getValue() })
    }

    return values
}

const resetProperties = (properties: DzProperty[]): void => {
    for (let index = 0; index < properties.length; index++) {
        const property = properties[index]
        if (!isTransformBakeProperty(property)) continue

        adjust(property, 0)
    }
}

const restoreValues = (values: CapturedPropertyValue[]): void => {
    for (let index = 0; index < values.length; index++) {
        const captured = values[index]
        adjust(captured.property, captured.value)
    }
}

export const bakeTransforms = (property: DzProperty, options: TransformBakeOptions): void => {
    const plan = collectTransformBakePlan(property, options)
    const capturedValues = captureValues(plan.capturedProperties)

    resetProperties(plan.resetProperties)
    restoreValues(capturedValues)
}

export const bakeRotations = (property: DzProperty): void => {
    bakeTransforms(property, { rotations: true })
}

export const bakeTranslations = (property: DzProperty): void => {
    bakeTransforms(property, { translations: true })
}

export const bakeScale = (property: DzProperty): void => {
    bakeTransforms(property, { scale: true })
}
