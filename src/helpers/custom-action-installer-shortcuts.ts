import { normalizeShortcut } from '@dsf/helpers/shortcut-helper'

export const CUSTOM_SHORTCUT_MARKER = '[custom]'

export type InstallerShortcutState = {
    installedActionName: string
    installedShortcut: string
    defaultShortcut: string
    effectiveShortcut: string
    isShortcutOverridden: boolean
}

export const updateShortcutOverrideState = (entry: InstallerShortcutState): void => {
    entry.isShortcutOverridden = Boolean(entry.installedActionName) &&
        normalizeShortcut(entry.installedShortcut) !== normalizeShortcut(entry.defaultShortcut)
}

export const getDisplayedSetupShortcut = (entry: InstallerShortcutState): string => {
    if (!entry.isShortcutOverridden) return entry.effectiveShortcut

    return entry.effectiveShortcut
        ? `${entry.effectiveShortcut} ${CUSTOM_SHORTCUT_MARKER}`
        : CUSTOM_SHORTCUT_MARKER
}

export const canResetSetupShortcut = (entry: InstallerShortcutState): boolean =>
    normalizeShortcut(entry.effectiveShortcut) !== normalizeShortcut(entry.defaultShortcut)

export const setSetupShortcut = (entry: InstallerShortcutState, shortcut: string): void => {
    const normalizedShortcut = normalizeShortcut(shortcut)

    if (entry.installedActionName) {
        entry.installedShortcut = normalizedShortcut
    }

    entry.effectiveShortcut = normalizedShortcut
    updateShortcutOverrideState(entry)
}

export const resetSetupShortcut = (entry: InstallerShortcutState): void => {
    const defaultShortcut = normalizeShortcut(entry.defaultShortcut)

    if (entry.installedActionName) {
        entry.installedShortcut = defaultShortcut
    }

    entry.effectiveShortcut = defaultShortcut
    updateShortcutOverrideState(entry)
}
