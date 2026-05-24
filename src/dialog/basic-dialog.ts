import { DialogBuilder } from '@dsf/dialog/builders/dialog-builder';

export abstract class BasicDialog {
    protected dialog: DzBasicDialog
    protected readonly builder: DialogBuilder

    protected get add(): DialogBuilder {
        return this.builder
    }

    constructor(name: string, id?: string) {
        this.builder = new DialogBuilder(name, id)
    }

    protected abstract build(): void

    protected init() {
        this.builder.build(() => {
            this.dialog = this.builder.context.dialog
            this.build()
        })
    }

    run(): boolean {
        this.init()
        this.builder.restoreObjectName()
        this.builder.traceGeometry('beforeExec')
        let result = this.dialog.exec()
        this.builder.traceGeometry('afterExec', { result })
        return result
    }

    ok(): boolean {
        return this.run() === true
    }

    cancel(): boolean {
        return this.run() === false
    }

    close() {
        this.dialog.close()
    }
}
