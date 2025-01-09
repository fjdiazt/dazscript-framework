export const getModifierKeys = (): {
    shift: boolean,
    ctrl: boolean,
    command: boolean,
    win: boolean,
    control: boolean,
    alt: boolean
} => {
    var nModifierState = App.modifierKeyState();

    return {
        shift: (nModifierState & 0x02000000) != 0,
        ctrl: (nModifierState & 0x04000000) != 0,
        alt: (nModifierState & 0x08000000) != 0,
        win: (nModifierState & 0x10000000) != 0,
        command: (nModifierState & 0x04000000) != 0,
        control: (nModifierState & 0x10000000) != 0
    };
}