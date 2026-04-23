import { debug } from '@dsf/common/log'
import { action } from '@dsf/core/action'
import { info } from '@dsf/helpers/message-box-helper'
import { AppSettings } from '@dsf/lib/settings'
import { config } from './config'

class CounterSettings extends AppSettings {
    constructor() {
        super(`${config.author}/02-AppSettings`)
    }

    // Each bind method reads the persisted value on construction and
    // auto-saves back to DzAppSettings whenever the observable changes.
    runCount$ = this.bindInt('runCount$', 0)
    username$ = this.bindString('username$', 'World')
    verbose$  = this.bindBoolean('verbose$', false)
    scale$    = this.bindFloat('scale$', 1.0)
    tags$     = this.bindArray('tags$', ['default'])
    profile$  = this.bindJson<{ theme: string; columns: number }>(
        'profile$',
        { theme: 'dark', columns: 3 },
    )
}

action({ text: '02 App Settings' }, () => {
    let s = new CounterSettings()

    // Each assignment persists to DzAppSettings immediately.
    s.runCount$.value += 1
    s.username$.value  = 'DazUser'
    s.verbose$.value   = true
    s.scale$.value     = 1.5
    s.tags$.value      = ['render', 'test']
    s.profile$.value   = { theme: 'light', columns: 2 }

    // forPath() opens a scoped DzAppSettings sub-key for ad-hoc values.
    let recent = s.forPath('recent')
    recent.setStringValue('last', 'figure.duf')

    const lines = [
        `Run count : ${s.runCount$.value}`,
        `Username  : ${s.username$.value}`,
        `Verbose   : ${s.verbose$.value}`,
        `Scale     : ${s.scale$.value}`,
        `Tags      : ${s.tags$.value.join(', ')}`,
        `Profile   : ${JSON.stringify(s.profile$.value)}`,
        `Last file : ${recent.getStringValue('last', '')}`,
    ]

    debug(lines.join('\n'))
    info(lines.join('\n'))
})
