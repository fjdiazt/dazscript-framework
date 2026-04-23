import { debug } from '@dsf/common/log'
import { action } from '@dsf/core/action'
import { PersistenceDialog, PersistenceDialogModel } from './02-persistence-dialog'

action({ text: '02 Persistence Dialog' }, () => {
    let model = new PersistenceDialogModel()
    let dialog = new PersistenceDialog(model)

    if (!dialog.run()) {
        debug('Persistence dialog cancelled')
        return
    }

    const lines = [
        `DzAppSettings checkbox : ${model.registryEnabled$.value}`,
        `App data JSON checkbox : ${model.fileEnabled$.value}`,
        `App data JSON file     : ${model.filePath}`,
    ]

    debug(lines.join('\n'))
})
