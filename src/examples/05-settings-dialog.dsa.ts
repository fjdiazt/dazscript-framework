import { debug } from '@dsf/common/log'
import { action } from '@dsf/core/action'
import { info } from '@dsf/helpers/message-box-helper'
import { RenderSettings, SettingsDialog } from './05-settings-dialog'

action({ text: '05 Settings Dialog' }, () => {
    // Settings are loaded from DzAppSettings on construction and
    // auto-saved on every change — values persist between script runs.
    let settings = new RenderSettings()
    let dialog   = new SettingsDialog(settings)

    if (!dialog.run()) {
        debug('Settings cancelled')
        return
    }

    const lines = [
        `Quality    : ${settings.quality$.value}`,
        `Samples    : ${settings.samples$.value}`,
        `Scale      : ${settings.scale$.value}`,
        `Output     : ${settings.outputPath$.value || '(default)'}`,
        `Format     : ${settings.format$.value}`,
        `Use GPU    : ${settings.useGpu$.value}`,
        `Verbose    : ${settings.verbose$.value}`,
    ]

    debug(lines.join('\n'))
    info(lines.join('\n'))
})
