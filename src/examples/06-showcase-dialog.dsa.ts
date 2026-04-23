import { debug } from '@dsf/common/log'
import { action } from '@dsf/core/action'
import { info } from '@dsf/helpers/message-box-helper'
import { TreeNode } from '@dsf/lib/tree-node'
import { SceneObject, ShowcaseDialog, ShowcaseDialogModel } from './06-showcase-dialog'

// Sample data

function buildSceneTree(): TreeNode<SceneObject>[] {
    let id = 0
    const next = () => ++id

    const group = (name: string, children: TreeNode<SceneObject>[] = []) =>
        new TreeNode<SceneObject>(
            name, name,
            { id: next(), name, type: 'Group', visible: true, locked: false },
            children,
        )

    const obj = (name: string, type: SceneObject['type'], visible = true, locked = false) =>
        new TreeNode<SceneObject>(name, name, { id: next(), name, type, visible, locked })

    return [
        group('Characters', [
            obj('Victoria 9',   'Figure'),
            obj('Michael 9',    'Figure', true, true),
            obj('Genesis 9',    'Figure', false),
        ]),
        group('Environment', [
            obj('Studio Floor', 'Prop'),
            obj('Background',   'Prop', false),
            group('Lights', [
                obj('Key Light',  'Light'),
                obj('Fill Light', 'Light', false),
                obj('Rim Light',  'Light'),
            ]),
        ]),
        obj('Camera 1', 'Camera'),
        obj('Camera 2', 'Camera', false),
    ]
}

// Action

action({ text: '06 Showcase Dialog' }, () => {
    let model  = new ShowcaseDialogModel()
    let dialog = new ShowcaseDialog(model)

    model.objects$.value = buildSceneTree()

    model.logEntries$.value = [
        '[Info]  Script started',
        '[Info]  Scene loaded - 4 root nodes',
        '[Debug] Settings restored from DzAppSettings',
    ]

    // Keep the detail panel in sync with the selected object.
    model.selectedObject$.connect(obj => {
        model.detailName$.value    = obj?.name    ?? ''
        model.detailType$.value    = obj?.type    ?? ''
        model.detailVisible$.value = obj?.visible ?? false
        model.detailLocked$.value  = obj?.locked  ?? false
    })

    if (!dialog.run()) {
        debug('Showcase dialog cancelled')
        return
    }

    let sel      = model.selectedObject$.value
    let settings = model.settings
    const lines  = sel
        ? [
            `Selected : ${sel.name}`,
            `Type     : ${sel.type}`,
            `Visible  : ${sel.visible}`,
            `Locked   : ${sel.locked}`,
            ``,
            `Quality  : ${settings.quality$.value}`,
            `Samples  : ${settings.samples$.value}`,
            `Format   : ${settings.exportFormat$.value}`,
        ]
        : ['No object selected']

    debug(lines.join('\n'))
    info(lines.join('\n'))
})
