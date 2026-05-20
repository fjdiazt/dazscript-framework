import { describe, expect, it, vi } from 'vitest'
import { getPropertyInputs, getPropertyOutputs } from './property-helper'

vi.mock('@dsf/core/global', () => ({
    sceneHelper: {
        getInternalName: vi.fn(),
        getNode: vi.fn(),
        getUniqueMorphName: vi.fn(),
        setInternalName: vi.fn(),
        setPropertyPath: vi.fn()
    }
}))

describe('property-helper relationships', () => {
    const property = (name: string, inheritsTypes: string[] = []) => ({
        name,
        inherits: (type: string) => inheritsTypes.indexOf(type) >= 0,
        getNumControllers: () => 0,
        getController: () => null,
        getNumSlaveControllers: () => 0,
        getSlaveController: () => null,
        getLinkProperty: () => null,
        getFollowProperty: () => null
    }) as any

    it('gets input properties from normal and redirected controller properties', () => {
        const driver = property('driver')
        const redirectedDriver = property('redirectedDriver')
        const controller = {
            getProperty: () => driver,
            getCurrentProperty: () => redirectedDriver
        }
        const driven = {
            ...property('driven'),
            getNumControllers: () => 1,
            getController: () => controller
        }

        expect(getPropertyInputs(driven as any)).toEqual([
            { property: driver, controller, source: 'controller' },
            { property: redirectedDriver, controller, source: 'currentController' }
        ])
    })

    it('gets input properties from direct numeric link and follow properties', () => {
        const link = property('link')
        const follow = property('follow')
        const driven = {
            ...property('driven', ['DzNumericProperty', 'DzFloatProperty']),
            getLinkProperty: () => link,
            getFollowProperty: () => follow
        }

        expect(getPropertyInputs(driven as any)).toEqual([
            { property: link, controller: null, source: 'link' },
            { property: follow, controller: null, source: 'follow' }
        ])
    })

    it('gets output properties from slave controller owners', () => {
        const output = property('output')
        const controller = {
            getOwner: () => output
        }
        const driver = {
            ...property('driver'),
            getNumSlaveControllers: () => 1,
            getSlaveController: () => controller
        }

        expect(getPropertyOutputs(driver as any)).toEqual([
            { property: output, controller, source: 'slaveController' }
        ])
    })

    it('does not duplicate the same relation', () => {
        const driver = property('driver')
        const controller = {
            getProperty: () => driver,
            getCurrentProperty: () => driver
        }
        const driven = {
            ...property('driven'),
            getNumControllers: () => 2,
            getController: () => controller
        }

        expect(getPropertyInputs(driven as any)).toEqual([
            { property: driver, controller, source: 'controller' },
            { property: driver, controller, source: 'currentController' }
        ])
    })

})
