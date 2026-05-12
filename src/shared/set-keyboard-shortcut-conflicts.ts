export type ShortcutConflict = {
    name: string
}

export const clearShortcutConflicts = (
    actionName: string,
    conflicts: ShortcutConflict[],
    clearShortcut: (name: string) => void
): void => {
    conflicts.forEach((action) => {
        if (!action || action.name === actionName) return
        clearShortcut(action.name)
    })
}
