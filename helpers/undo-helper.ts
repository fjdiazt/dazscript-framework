const acceptUndoFor = (caption: string, callback: () => void) => {
    beginUndo()
    callback?.()
    acceptUndo(caption)
}

export { acceptUndoFor as acceptUndo }
