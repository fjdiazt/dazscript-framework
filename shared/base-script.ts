import { debug, error, raise } from '@dsf/common/log';
import { acceptUndo } from '@dsf/helpers/undo-helper';

export abstract class BaseScript {
    protected readonly scriptName: string
    protected anounceExecution: boolean = true

    constructor() {
        this.scriptName = (<any>this.constructor).name;
    }

    protected abstract run(): void

    exec() {
        if (this.anounceExecution) {
            debug(`=== Running script "${this.scriptName}" ===`)
        }

        try {
            this.run()
        } catch (err) {
            error(`There was an error while running the script "${this.scriptName}"`)
            raise(err)
        }
    }

    protected acceptUndo(callback: () => void) {
        acceptUndo(this.scriptName, callback);
    }
}
