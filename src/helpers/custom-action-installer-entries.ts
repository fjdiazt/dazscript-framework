import type { CustomAction } from '@dsf/core/custom-action'

export type InstallerActionEntry = {
    action: CustomAction
}

const isActionLike = (value: any): value is CustomAction =>
    Boolean(value && (typeof value.filePath !== 'undefined' || typeof value.text !== 'undefined'))

export const toActionKey = (action?: CustomAction | null): string =>
    String(action?.filePath ?? action?.text ?? '')

const findByDisplayedText = <TEntry extends InstallerActionEntry>(
    entries: TEntry[],
    displayedText: string
): TEntry | null => {
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i]
        if (String(entry.action.text ?? '') === displayedText) return entry
    }

    return null
}

const findByActionKey = <TEntry extends InstallerActionEntry>(
    entries: TEntry[],
    key: string
): TEntry | null => {
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i]
        if (toActionKey(entry.action) === key) return entry
    }

    return null
}

export const asInstallerActionEntry = <TEntry extends InstallerActionEntry>(value: any): TEntry | null => {
    if (isActionLike(value?.action)) return value as TEntry
    if (isActionLike(value?.value?.action)) return value.value as TEntry
    return null
}

export const getCanonicalInstallerEntry = <TEntry extends InstallerActionEntry>(
    entries: TEntry[],
    value: any,
    displayedActionText?: string
): TEntry | null => {
    const displayedText = String(displayedActionText ?? '')
    const displayedMatch = findByDisplayedText(entries, displayedText)
    if (displayedMatch) return displayedMatch

    const candidate = asInstallerActionEntry<TEntry>(value)

    if (!candidate || !isActionLike(candidate.action)) return null

    const key = toActionKey(candidate.action)
    return findByActionKey(entries, key) ?? candidate
}
