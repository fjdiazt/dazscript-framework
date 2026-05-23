export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'off'

declare const __DAZSCRIPT_LOG_LEVEL__: string | undefined

const logLevels: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'off']
const logLevelWeights: { [key in LogLevel]: number } = {
    trace: 0,
    debug: 1,
    info: 2,
    warn: 3,
    error: 4,
    off: 5
}

let currentLogLevel: LogLevel = normalizeLogLevel(
    typeof __DAZSCRIPT_LOG_LEVEL__ === 'string'
        ? __DAZSCRIPT_LOG_LEVEL__
        : 'trace'
)

export const setLogLevel = (level: string): LogLevel => {
    currentLogLevel = normalizeLogLevel(level)
    return currentLogLevel
}

export const getLogLevel = (): LogLevel => currentLogLevel

export function normalizeLogLevel(level: string): LogLevel {
    if (!level) return 'trace'
    const normalized = level.toLowerCase() as LogLevel
    return logLevels.indexOf(normalized) >= 0 ? normalized : 'debug'
}

export const shouldLog = (level: LogLevel): boolean => {
    return logLevelWeights[level] >= logLevelWeights[currentLogLevel]
        && currentLogLevel !== 'off'
}

export const debug = (message: any) => {
    if (!shouldLog('debug')) return
    app().debug(format(message))
    flush()
}

export const info = (message: any) => {
    if (!shouldLog('info')) return
    app().log(format(message))
    flush()
}

export const error = (message: any) => {
    if (!shouldLog('error')) return
    app().warning(format(message, "ERROR"))
    flush()
}

export const warn = (message: any) => {
    if (!shouldLog('warn')) return
    app().warning(message)
    flush()
}

export const trace = (message: any) => {
    if (!shouldLog('trace')) return
    app().debug(format(message, "TRACE"))
    flush()
}

export const status = (message: any, log: boolean = true) => {
    app().statusLine(message, log)
}

/**
 * Log the error and raise an exception
 * @param err
 */
export const raise = (err: string) => {
    error(err)
    throw Error(err)
}

export const dump = (obj: any) => {
    if (!shouldLog('debug')) return
    app().debug(`[DUMP]\r\n${JSON.stringify(obj, null, 2)}`)
    flush()
}

const format = (message: string, level?: 'ERROR' | 'TRACE' | 'DUMP' | 'INFO') => {
    if (message == null) {
        return ''
    }

    let text = message

    if (level) text = `[${level}] ${text}`
    return text
}

const app = (): any => App

const flush = () => {
    app().flushLogBuffer()
}

