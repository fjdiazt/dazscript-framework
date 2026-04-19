import * as log from '@dsf/common/log'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD'
export type HttpConnectionMode = 'http' | 'https'
export type HttpResponseType = 'json' | 'text' | 'bytes'

export interface HttpAuthOptions {
    basic?: {
        username: string
        password: string
    }
    bearerToken?: string
}

export interface HttpRequestOptions {
    host: string
    path: string
    method?: HttpMethod
    connectionMode?: HttpConnectionMode
    responseType?: HttpResponseType
    queryString?: string
    headers?: Record<string, string>
    contentType?: string
    body?: string | ByteArray | object
    auth?: HttpAuthOptions
}

export interface HttpResponse<T = any> {
    ok: boolean
    bytes: ByteArray
    text: string
    data: T | null
    error: string
    parseError: string
}

export const basicAuth = (username: string, password: string): string => {
    const credentials = new ByteArray(username + ':' + password)
    const encoded = credentials.toBase64().convertToString()
    return 'Basic ' + encoded.replace(/\r|\n/g, '')
}

export const bearerAuth = (token: string): string => {
    return 'Bearer ' + token
}

export const request = <T = any>(options: HttpRequestOptions): HttpResponse<T> => {
    const emptyBytes = new ByteArray()
    const emptyResponse: HttpResponse<T> = {
        ok: false,
        bytes: emptyBytes,
        text: '',
        data: null,
        error: '',
        parseError: ''
    }

    if (!options || !options.host || !options.path) {
        return {
            ...emptyResponse,
            error: 'Http request requires host and path.'
        }
    }

    const http = new DzHttpHelper()
    http.setConnectionMode(options.connectionMode ?? 'https')
    http.setHost(options.host)
    http.setPath(options.path)
    http.setRequestMethod(options.method ?? 'GET')

    if (options.queryString) {
        http.setQueryString(options.queryString)
    }

    if (options.contentType) {
        http.setContentType(options.contentType)
    }

    const headers = buildHeaders(options)
    const keys = Object.keys(headers)
    if (keys.length > 0) {
        const values: string[] = []
        for (let i = 0; i < keys.length; i++) {
            values.push(headers[keys[i]])
        }
        http.setHeaderValues(keys, values)
    }

    try {
        const requestBody = buildRequestBody(options)
        const bytes = requestBody ? http.doSynchronousRequest(requestBody) : http.doSynchronousRequest()
        const error = http.getError()
        const text = bytes ? bytes.convertToStringFromUtf8() : ''
        const responseType = options.responseType ?? 'json'

        let parseError = ''
        let data: T | null = null

        if (responseType === 'json' && text) {
            try {
                data = JSON.parse(text) as T
            } catch (e) {
                parseError = 'Json parse error: ' + e
            }
        }

        return {
            ok: !error && !parseError,
            bytes: bytes,
            text: text,
            data: data,
            error: error,
            parseError: parseError
        }
    } catch (e) {
        const exceptionText = 'Http request exception: ' + e
        log.error(exceptionText)
        return {
            ...emptyResponse,
            error: exceptionText
        }
    }
}
export const get = <T = any>(options: Omit<HttpRequestOptions, 'method'>): HttpResponse<T> => {
    return request({ ...options, method: 'GET' })
}

export const post = <T = any>(options: Omit<HttpRequestOptions, 'method'>): HttpResponse<T> => {
    return request({ ...options, method: 'POST' })
}

export const put = <T = any>(options: Omit<HttpRequestOptions, 'method'>): HttpResponse<T> => {
    return request({ ...options, method: 'PUT' })
}

export const patch = <T = any>(options: Omit<HttpRequestOptions, 'method'>): HttpResponse<T> => {
    return request({ ...options, method: 'PATCH' })
}

export const del = <T = any>(options: Omit<HttpRequestOptions, 'method'>): HttpResponse<T> => {
    return request({ ...options, method: 'DELETE' })
}

export const head = <T = any>(options: Omit<HttpRequestOptions, 'method'>): HttpResponse<T> => {
    return request({ ...options, method: 'HEAD' })
}

const buildRequestBody = (options: HttpRequestOptions): ByteArray | undefined => {
    if (options.body == null) return undefined
    if (typeof options.body === 'string') return new ByteArray(options.body)
    if (options.body instanceof ByteArray) return options.body

    if (!options.contentType) {
        options.contentType = 'application/json'
    }

    return new ByteArray(JSON.stringify(options.body))
}

const buildHeaders = (options: HttpRequestOptions): Record<string, string> => {
    const headers = { ...(options.headers ?? {}) }

    if (options.auth?.bearerToken) {
        headers.Authorization = bearerAuth(options.auth.bearerToken)
    } else if (options.auth?.basic && !headers.Authorization) {
        headers.Authorization = basicAuth(options.auth.basic.username, options.auth.basic.password)
    }

    return headers
}
