import { debug } from '@dsf/common/log'
import { action } from '@dsf/core/action'
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
        // appDataPath will be: <DazAppData>/DazScriptFramework/03-LocalFiles
        super(`${config.author}/03-LocalFiles`)
    }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function ensureDir(path: string): void {
    let dir = new DzDir()
    if (!dir.exists(path)) dir.mkpath(path)
}

function writeJson(path: string, data: object): boolean {
    let file = new DzFile(path)
    if (!file.open(DzFile.WriteOnly | DzFile.Truncate)) return false
    file.write(JSON.stringify(data, null, 2))
    file.close()
    return true
}

function readJson<T>(path: string, fallback: T): T {
    let file = new DzFile(path)
    if (!file.open(DzFile.ReadOnly)) return fallback
    let raw = file.read()
    file.close()
    try { return JSON.parse(raw) as T } catch { return fallback }
}

// ── Action ───────────────────────────────────────────────────────────────────

action({ text: '03 Local Files' }, () => {
    let settings = new LocalFileSettings()
    let dir      = settings.appDataPath   // absolute path under DazAppData

    ensureDir(dir)

    let filePath = `${dir}/run-log.json`
    let log      = readJson<RunLog>(filePath, { count: 0, entries: [] })

    log.count += 1
    log.entries.push(new Date().toLocaleString())
    if (log.entries.length > 5) log.entries.shift()   // keep last 5

    let ok = writeJson(filePath, log)

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
