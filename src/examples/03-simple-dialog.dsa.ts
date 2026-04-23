import { debug } from '@dsf/common/log'
import { action } from '@dsf/core/action'
import { info } from '@dsf/helpers/message-box-helper'
import { SimpleDialog, SimpleDialogModel } from './03-simple-dialog'

action({ text: '03 Simple Dialog' }, () => {
    let model  = new SimpleDialogModel()
    let dialog = new SimpleDialog(model)

    if (!dialog.run()) {
        debug('Dialog cancelled')
        return
    }

    const lines = [
        `Name    : ${model.name$.value}`,
        `Enabled : ${model.enabled$.value}`,
        `Notes   : ${model.notes$.value || '(none)'}`,
    ]

    debug(lines.join('\n'))
    info(lines.join('\n'))
})
