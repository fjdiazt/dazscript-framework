import { debug, error, raise } from '@dsf/common/log';

export class ActionDefinition {
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

type ActionCallback = () => void
type ActionRunnable = { [key: string]: unknown }
type ActionConstructor = new (...args: any[]) => any
type ActionTarget = ActionCallback | ActionRunnable | ActionConstructor

const isFunction = (value: unknown): value is Function => typeof value === 'function'

const isConstructorTarget = (target: ActionTarget): target is ActionConstructor => {
    if (!isFunction(target)) {
        return false
    }

    const prototype = (target as ActionConstructor).prototype as ActionRunnable | undefined
    return !!prototype && (typeof prototype.run === 'function' || typeof prototype.exec === 'function')
}

const invokeRunnable = (target: ActionRunnable) => {
    if (typeof target.run === 'function') {
        target.run()
        return
    }

    if (typeof target.exec === 'function') {
        target.exec()
        return
    }

    throw new Error('Action target must expose run() or exec().')
}

export function action(definition: ActionDefinition, target: ActionTarget): void {
    const scriptName = definition?.text || 'Unnamed Script'

    try {
        const runnable = isConstructorTarget(target)
            ? new target()
            : target

        const announceExecution = !isFunction(runnable) && runnable.anounceExecution === false
            ? false
            : true

        if (announceExecution) {
            debug(`=== Running script "${scriptName}" ===`)
        }

        if (isFunction(runnable)) {
            runnable()
            return
        }

        invokeRunnable(runnable)
    } catch (err) {
        error(`There was an error while running the script "${scriptName}"`)
        raise(err)
    }
}
