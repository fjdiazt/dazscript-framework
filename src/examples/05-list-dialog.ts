import { BasicDialog } from '@dsf/dialog/basic-dialog'
import { PopupMenuItem } from '@dsf/dialog/builders/popup-menu-builder'
import { getDataItem } from '@dsf/helpers/list-view-helper'
import { Observable } from '@dsf/lib/observable'
import { TreeNode } from '@dsf/lib/tree-node'

// Types

export interface FileItem {
    name: string
    type: 'folder' | 'file'
    size: number
}

// Model

export class ListDialogModel {
    keywords$     = new Observable('')
    files$        = new Observable<TreeNode<FileItem>[]>([])
    selected$     = new Observable<FileItem>()
    recentFiles$  = new Observable<string[]>([])
    selectedRecent$ = new Observable<string[]>([])
}

// Dialog

export class ListDialog extends BasicDialog {
    constructor(private readonly model: ListDialogModel) {
        super('05 List View')
    }

    protected build(): void {
        let add   = this.add
        let model = this.model

        this.builder.options({ resizable: true, width: 640, height: 520 })

        // Search bar
        add.horizontal((layout) => {
            layout.spacing = 5
            add.label('Search:').minWidth(50)
            add.edit()
                .value(model.keywords$)
                .placeholder('Filter files...')
                .focus()
        })

        // Tree list with context menu and keyword filter
        add.list.view<FileItem>()
            .expanded(true)
            .items(model.files$)
            .columns(['Name', 'Type', 'Size (KB)'])
            .text(item => [
                item.name,
                item.value?.type ?? '',
                item.value ? String(Math.round(item.value.size / 1024)) : '',
            ])
            .data(item => item.value)
            .selected(model.selected$)
            .filter({
                keywords: model.keywords$,
                field: li => li.text(0),
                selectOnFilter: true,
            })
            .contextMenu((_, li) => {
                let file  = getDataItem<FileItem>(li)
                let label = file?.name ?? 'item'
                let items: PopupMenuItem[] = [
                    { text: `Open "${label}"`,  activated: () => { /* open */ } },
                    { text: `Rename "${label}"`, activated: () => { /* rename */ } },
                    { text: '' },
                    { text: 'Copy Path', activated: () => { /* copy to clipboard */ } },
                    { text: 'Delete',    activated: () => { /* delete */ } },
                ]
                return add.contextMenu().items(...items).build()
            })
            .build()

        // Simple list box for recently opened files
        add.group('Recent Files').build(() => {
            add.list.box()
                .items(model.recentFiles$)
                .mode('extended')
                .selected(model.selectedRecent$)
                .build()
        })
    }
}
