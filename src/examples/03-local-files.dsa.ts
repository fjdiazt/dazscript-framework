import { debug } from '@dsf/common/log'
import { action } from '@dsf/core/action'
import { readFromFile, saveToFile } from '@dsf/helpers/file-helper'
import { info } from '@dsf/helpers/message-box-helper'
import { AppSettings } from '@dsf/lib/settings'
import { config } from './config'

// ── Types ────────────────────────────────────────────────────────────────────

interface RunLog {
    count: number
    entries: string[]
}

// ── Settings ─────────────────────────────────────────────────────────────────

class LocalFileSettings extends AppSettings {
    constructor() {
        // appDataPath resolves to: <DazAppData>/DazScriptFramework/03-LocalFiles
        super(`${config.author}/03-LocalFiles`)
    }
}

// ── Action ───────────────────────────────────────────────────────────────────

action({ text: '03 Local Files' }, () => {
    let settings = new LocalFileSettings()
    let dir      = settings.appDataPath
    let filePath = `${dir}/run-log.json`

    // readFromFile / saveToFile (from file-helper) handle DzFile and DzDir internally.
    let log = readFromFile<RunLog>(filePath) ?? { count: 0, entries: [] }

    log.count += 1
    log.entries.push(new Date().toLocaleString())
    if (log.entries.length > 5) log.entries.shift()   // keep last 5

    let ok = saveToFile(filePath, JSON.stringify(log, null, 2))

    const lines = [
        `Data dir   : ${dir}`,
        `File path  : ${filePath}`,
        `Write ok   : ${ok}`,
        `Run count  : ${log.count}`,
        `Last runs  :`,
        ...log.entries.map(e => `  ${e}`),
    ]

    debug(lines.join('\n'))
    info(lines.join('\n'))
})
