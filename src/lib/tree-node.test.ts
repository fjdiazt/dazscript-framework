import { describe, expect, it } from 'vitest'
import { TreeNode } from './tree-node'

describe('TreeNode.values', () => {
    it('returns values in depth-first order and skips null nodes', () => {
        const tree = new TreeNode('root', '', null, [
            new TreeNode('menu', '/menu', { name: 'menu' }, [
                new TreeNode('action-a', '/menu/action-a', { name: 'action-a' }),
                new TreeNode('group', '/menu/group', null, [
                    new TreeNode('action-b', '/menu/group/action-b', { name: 'action-b' })
                ])
            ])
        ])

        expect(tree.values()).toEqual([
            { name: 'menu' },
            { name: 'action-a' },
            { name: 'action-b' }
        ])
    })
})
