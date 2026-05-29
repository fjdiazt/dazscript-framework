type BulkSelectableEntry = {
    selected: boolean
}

export const SETUP_BULK_ACTIONS = {
    installAll: {
        label: 'Install All',
        toolTip: 'Install every setup entry, ignoring the current search filter and checkbox state.',
        whatsThis: 'Installs every script action in this setup dialog. This does not depend on which rows are checked or currently visible.'
    },
    uninstallAll: {
        label: 'Uninstall All',
        toolTip: 'Uninstall every setup entry, ignoring the current search filter and checkbox state.',
        whatsThis: 'Removes every script action in this setup dialog from its menu and toolbar targets. This does not depend on which rows are checked or currently visible.'
    }
}

export const applySetupBulkSelection = <TEntry extends BulkSelectableEntry>(entries: TEntry[], selected: boolean): void => {
    entries.forEach((entry) => {
        entry.selected = selected
    })
}
