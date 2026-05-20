import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./numeric-property-helper', () => ({ adjust: vi.fn() }))
vi.mock('@dsf/core/global', () => ({
    sceneHelper: {
        getInternalName: vi.fn(),
        getNode: vi.fn(),
        getUniqueMorphName: vi.fn(),
        setInternalName: vi.fn(),
        setPropertyPath: vi.fn()
    }
}))

const { adjust } = await import('./numeric-property-helper')
const { bakeRotations, bakeScale, bakeTranslations, bakeTransforms, collectTransformBakePlan } = await import('./transform-bake-helper')

type TestProperty = {
    name: string
    path: string
    value: number
    outputs: TestProperty[]
    getName: () => string
    getPath: () => string
    getValue: () => number
    getNumSlaveControllers: () => number
    getSlaveController: (index: number) => { getOwner: () => TestProperty }
    getNumControllers: () => number
    getController: () => null
    inherits: (type: string) => boolean
}

const property = (name: string, path = '/Pose Controls'): TestProperty => {
    const testProperty: TestProperty = {
        name,
        path,
        value: 7,
        outputs: [],
        getName: () => testProperty.name,
        getPath: () => testProperty.path,
        getValue: () => testProperty.value,
        getNumSlaveControllers: () => testProperty.outputs.length,
        getSlaveController: (index: number) => ({ getOwner: () => testProperty.outputs[index] }),
        getNumControllers: () => 0,
        getController: () => null,
        inherits: (type: string) => type === 'DzNumericProperty' || type === 'DzFloatProperty'
    }

    return testProperty
}

const link = (driver: TestProperty, output: TestProperty): void => {
    driver.outputs.push(output)
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe('transform bake helper', () => {
    it('plans recursive output reset and selected rotation capture', () => {
        const master = property('body_ctrl_rHandGrasp')
        const middle = property('body_ctrl_rFingersGrasp')
        const rotation = property('ZRotate', '/General/Transforms/Rotation')
        const corrective = property('Value', '/Hidden/Base Correctives/Hands')
        link(master, middle)
        link(middle, rotation)
        link(rotation, corrective)

        const plan = collectTransformBakePlan(master, { rotations: true })

        expect(plan.resetProperties).toEqual([master, middle, rotation, corrective])
        expect(plan.capturedProperties).toEqual([rotation])
    })

    it('bakes selected transforms by capturing final values, zeroing chain, then restoring captures', () => {
        const master = property('master')
        const rotation = property('XRotate', '/General/Transforms/Rotation')
        rotation.value = 45
        link(master, rotation)

        bakeTransforms(master, { rotations: true })

        expect(adjust).toHaveBeenNthCalledWith(1, master, 0)
        expect(adjust).toHaveBeenNthCalledWith(2, rotation, 0)
        expect(adjust).toHaveBeenNthCalledWith(3, rotation, 45)
    })

    it('filters translations and scale independently', () => {
        const master = property('master')
        const translation = property('XTranslate', '/General/Transforms/Translation')
        const rotation = property('XRotate', '/General/Transforms/Rotation')
        const scale = property('XScale', '/General/Transforms/Scale')
        link(master, translation)
        link(master, rotation)
        link(master, scale)

        expect(collectTransformBakePlan(master, { translations: true }).capturedProperties).toEqual([translation])
        expect(collectTransformBakePlan(master, { rotations: true }).capturedProperties).toEqual([rotation])
        expect(collectTransformBakePlan(master, { scale: true }).capturedProperties).toEqual([scale])
    })

    it('exposes focused bake helpers', () => {
        const master = property('master')
        const translation = property('YTranslate', '/General/Transforms/Translation')
        const rotation = property('YRotate', '/General/Transforms/Rotation')
        const scale = property('YScale', '/General/Transforms/Scale')
        link(master, translation)
        link(master, rotation)
        link(master, scale)

        bakeRotations(master)
        expect(adjust).toHaveBeenLastCalledWith(rotation, 7)

        vi.clearAllMocks()
        bakeTranslations(master)
        expect(adjust).toHaveBeenLastCalledWith(translation, 7)

        vi.clearAllMocks()
        bakeScale(master)
        expect(adjust).toHaveBeenLastCalledWith(scale, 7)
    })
})
