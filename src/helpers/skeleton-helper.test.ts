import { describe, expect, it } from 'vitest'
import { getMirrorNameCandidate, getMirrorNodeMatch, getMirrorNodes } from './skeleton-helper'

type TestNode = {
    name: string
    getName: () => string
}

const node = (name: string): TestNode => ({
    name,
    getName: () => name
})

const figure = (names: string[]) => ({
    findNodeChild: (name: string) => names.indexOf(name) >= 0 ? node(name) : null
})

describe('skeleton mirror helper', () => {
    it('resolves Genesis-style compact prefixes', () => {
        expect(getMirrorNameCandidate('rThighBend')).toMatchObject({
            side: 'right',
            convention: 'compact-prefix',
            sourceToken: 'r',
            mirrorToken: 'l',
            mirrorName: 'lThighBend'
        })

        expect(getMirrorNameCandidate('lHand')).toMatchObject({
            side: 'left',
            mirrorName: 'rHand'
        })
    })

    it('resolves underscore prefix and suffix names', () => {
        expect(getMirrorNameCandidate('right_hand')).toMatchObject({
            side: 'right',
            convention: 'underscore-prefix',
            mirrorName: 'left_hand'
        })

        expect(getMirrorNameCandidate('hand_R')).toMatchObject({
            side: 'right',
            convention: 'underscore-suffix',
            mirrorName: 'hand_L'
        })
    })

    it('resolves word prefix and suffix names', () => {
        expect(getMirrorNameCandidate('RightHand')).toMatchObject({
            side: 'right',
            convention: 'word-prefix',
            mirrorName: 'LeftHand'
        })

        expect(getMirrorNameCandidate('HandLeft')).toMatchObject({
            side: 'left',
            convention: 'word-suffix',
            mirrorName: 'HandRight'
        })
    })

    it('does not classify center bones as mirrored', () => {
        expect(getMirrorNameCandidate('hip')).toBeNull()
        expect(getMirrorNameCandidate('abdomenLower')).toBeNull()
    })

    it('returns rich match metadata while keeping getMirrorNodes compatible', () => {
        const testFigure = figure(['lThighBend', 'hip'])
        const source = node('rThighBend')
        const center = node('hip')

        const match = getMirrorNodeMatch(testFigure as unknown as DzSkeleton, source as unknown as DzNode)

        expect(match.side).toBe('right')
        expect(match.mirror?.getName()).toBe('lThighBend')
        expect(getMirrorNodes(testFigure as unknown as DzSkeleton, [
            source as unknown as DzNode,
            center as unknown as DzNode
        ]).map(item => item.getName())).toEqual(['lThighBend'])
    })
})
