import { debug } from '@dsf/common/log'
import { action } from '@dsf/core/action'
import { info } from '@dsf/helpers/message-box-helper'
import { TreeNode } from '@dsf/lib/tree-node'
import { FileItem, ListDialog, ListDialogModel } from './05-list-dialog'

// Sample data

function buildFileTree(): TreeNode<FileItem>[] {
    const folder = (name: string, children: TreeNode<FileItem>[] = []) =>
        new TreeNode<FileItem>(name, name, { name, type: 'folder', size: 0 }, children)

    const file = (name: string, size: number) =>
        new TreeNode<FileItem>(name, name, { name, type: 'file', size })

    return [
        folder('Characters', [
            file('Victoria.duf',  1_200_000),
            file('Michael.duf',   980_000),
        ]),
        folder('Props', [
            file('Chair.obj',     45_000),
            file('Table.obj',     62_000),
            folder('Lights', [
                file('Studio.duf', 12_000),
            ]),
        ]),
        file('Scene.duf', 3_400_000),
    ]
}

// Action

action({ text: '05 List Dialog' }, () => {
    let model  = new ListDialogModel()
    model.files$.value       = buildFileTree()
    model.recentFiles$.value = ['Victoria.duf', 'Chair.obj', 'Scene.duf']

    let dialog = new ListDialog(model)

    if (!dialog.run()) {
        debug('List dialog cancelled')
        return
    }

    let sel = model.selected$.value
    const lines = sel
        ? [`Selected : ${sel.name}`, `Type     : ${sel.type}`, `Size     : ${sel.size} bytes`]
        : ['No item selected']

    debug(lines.join('\n'))
    info(lines.join('\n'))
})
