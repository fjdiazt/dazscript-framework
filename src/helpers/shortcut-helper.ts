const shortcutTokenMap: { [key: string]: string } = {
    'CTRL': 'Ctrl',
    'CONTROL': 'Ctrl',
    'SHIFT': 'Shift',
    'ALT': 'Alt',
    'OPTION': 'Alt',
    'WIN': 'Win',
    'WINDOWS': 'Win',
    'CMD': 'Win',
    'COMMAND': 'Win',
    'SPACE': 'Space',
    'HOME': 'Home',
    'END': 'End',
    'INS': 'Ins',
    'INSERT': 'Ins',
    'DEL': 'Del',
    'DELETE': 'Del',
    'TAB': 'Tab',
    'BACKSPACE': 'Backspace',
    'COMMA': 'Comma',
    'PERIOD': 'Period',
    'PLUS': 'Plus',
    'MINUS': 'Minus',
    'PGUP': 'PgUp',
    'PAGEUP': 'PgUp',
    'PGDOWN': 'PgDn',
    'PGDN': 'PgDn',
    'LEFT': 'Left',
    'RIGHT': 'Right',
    'UP': 'Up',
    'DOWN': 'Down',
}

export const normalizeShortcut = (shortcut: string): string => {
    if (!shortcut) return ''

    return shortcut
        .split('+')
        .map(part => part.trim())
        .filter(Boolean)
        .map(part => {
            if (part.length === 1) return part.toUpperCase()

            const key = part.toUpperCase()
            return shortcutTokenMap[key] || part
        })
        .join('+')
}
