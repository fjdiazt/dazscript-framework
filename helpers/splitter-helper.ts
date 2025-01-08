export const restoreState = (splitter: DzSplitter, state: string) => {
    if (!state) return
    let base64Array = new ByteArray(state)
    splitter.restoreState(base64Array.fromBase64(base64Array))
}

export const getState = (splitter: DzSplitter): string => {
    return splitter.saveState().toBase64().convertToString()
}