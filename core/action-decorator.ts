class CustomActionDefinition {
    text?: string
    description?: string
    icon?: string
    menuPath?: string | boolean
    toolbar?: string
    sort?: number
    group?: string
    shortcut?: string
    bundle?: string | boolean
}

export const action = (action?: CustomActionDefinition) => {
    return (target: Function) => {
    }
}