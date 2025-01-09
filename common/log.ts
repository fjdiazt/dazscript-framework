import * as global from '@dsf/core/global'

export const debug = (message: any) => {
    App.debug(format(message))
    App.flushLogBuffer()
}

export const info = (message: any) => {
    global.app.log(format(message))
    App.flushLogBuffer()
}

export const error = (message: any) => {
    App.warning(format(message, "ERROR"))
    App.flushLogBuffer()
}

export const warn = (message: any) => {
    App.warning(message)
    App.flushLogBuffer()
}

export const trace = (message: any) => {
    App.debug(format(message, "TRACE"))
    App.flushLogBuffer()
}

export const status = (message: any, log: boolean = true) => {
    App.statusLine(message, log)
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
    App.debug(`[DUMP]\r\n${JSON.stringify(obj, null, 2)}`)
    App.flushLogBuffer()
}


const format = (message: string, level?: 'ERROR' | 'TRACE' | 'DUMP' | 'INFO') => {
    if (message == null) {
        return ''
    }

    let text = message

    if (level) text = `[${level}] ${text}`
    return text
}

