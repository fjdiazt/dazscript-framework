export const isNumeric = (value: string | number): boolean => {
    return ((value != null) &&
        (value !== '') &&
        !isNaN(Number(value.toString())))
}

export const contains = (source: string, search: string | string[]): boolean => {
    if (Array.isArray(search)) {
        for (const s of search) {
            if (source.indexOf(s) >= 0) return true
        }
        return false
    }
    return source.indexOf(search) >= 0
}

export const remove = (source: string, search: string): string => {
    return source.replace(search, "")
}

export const count = (source: string, search: string): number => {
    return source.split(search).length - 1
}

export const isGUID = (str: string): boolean => {
    const GUIDPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    return GUIDPattern.test(str);
}