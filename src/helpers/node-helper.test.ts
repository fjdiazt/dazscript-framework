import { describe, expect, it, vi } from 'vitest'
import { isHairType } from './node-helper'

const getTypeForNode = vi.fn()
const isHairTypeAsset = vi.fn()

vi.mock('@dsf/core/global', () => ({
    app: {
        getAssetMgr: () => ({
            getTypeForNode,
            isHairType: isHairTypeAsset
        })
    },
    sceneHelper: {}
}))

describe('node helper hair classification', () => {
    it('treats eyelash content types as hair regardless of case', () => {
        getTypeForNode.mockReturnValue('Follower/Attachment/Head/Face/Eyelashes')
        isHairTypeAsset.mockReturnValue(false)

        const node = {
            iskindof: (type: string) => type === 'DzSkeleton',
            getSkeleton: () => node
        }

        expect(isHairType(node as unknown as DzNode)).toBe(true)
    })
})
