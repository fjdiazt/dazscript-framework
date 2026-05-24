import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BasicDialog } from './basic-dialog'
import { setLogLevel } from '../common/log'

class TestDialog extends BasicDialog {
    protected build(): void {
        this.builder.options({ resizable: true })
    }
}

class HeaderDialog extends BasicDialog {
    protected build(): void {
        this.builder.header({ text: 'Header' }).build()
        this.builder.options({ resizable: true })
    }
}

class NonResizableDefaultSizeDialog extends BasicDialog {
    protected build(): void { }
}

class ExplicitFixedHeightDialog extends BasicDialog {
    protected build(): void {
        this.builder.options({ height: 35 })
    }
}

describe('dialog geometry trace', () => {
    beforeEach(() => {
        ; (globalThis as any).App = {
            debug: vi.fn(),
            log: vi.fn(),
            warning: vi.fn(),
            flushLogBuffer: vi.fn(),
            statusLine: vi.fn()
        }
        ; (globalThis as any).DzBasicDialog = class {
            caption = ''
            width = 300
            height = 200
            minHeight = 0
            maxHeight = 0
            maxWidth = 0
            sizeGripEnabled = false
            fixedHeight: number | undefined
            fixedWidth: number | undefined
            private widget = {
                objectName: '',
                x: 10,
                y: 20,
                width: 300,
                height: 200,
                minimumSizeHint: { width: 300, height: 200 }
            }

            getWidget() {
                return this.widget
            }

            inherits(typeName: string) {
                return typeName === 'DzWidget'
            }

            addLayout() { }

            exec() {
                if (this.sizeGripEnabled) {
                    this.width = 640
                    this.height = 480
                    this.widget.width = 640
                    this.widget.height = 480
                    return true
                }

                this.widget.minimumSizeHint = { width: 196, height: 76 }
                this.width = this.fixedWidth ?? this.widget.minimumSizeHint.width
                this.height = this.fixedHeight ?? this.widget.minimumSizeHint.height
                this.widget.width = this.width
                this.widget.height = this.height
                return true
            }

            setFixedHeight(value: number) {
                this.fixedHeight = value
                this.height = value
            }

            setFixedWidth(value: number) {
                this.fixedWidth = value
                this.width = value
            }
        }
        const Layout = class {
            direction = 0
            constructor(public parent: unknown) { }
            inherits(typeName: string) {
                return typeName === 'DzLayout'
            }
            addWidget() { }
        }
        class Widget {
            private _name = ''
            height = 30
            width = 100
            minHeight = 0
            maxHeight = 0
            toolTip = ''
            whatsThis = ''
            constructor(private parent: any) { }
            set name(value: string) {
                this._name = value
                if (this.parent?.getWidget) this.parent.getWidget().objectName = value
            }
            get name() {
                return this._name
            }
            getWidget() {
                return this
            }
            inherits(typeName: string) {
                return typeName === 'DzWidget'
            }
            setFixedHeight(value: number) {
                this.height = value
            }
            setFixedWidth(value: number) {
                this.width = value
            }
            show() { }
            hide() { }
        }
        ; (globalThis as any).DzVBoxLayout = Layout
        ; (globalThis as any).DzHBoxLayout = Layout
        ; (globalThis as any).DzWidget = Widget
        ; (globalThis as any).DzLabel = Widget
        ; (globalThis as any).DzTextBrowser = class extends Widget {
            html = ''
            readOnly = false
            lineWrapMode = 0
            wordWrapMode = 0
        }
        ; (globalThis as any).DzTextEdit = { WidgetWidth: 1, WordWrap: 2 }
        ; (globalThis as any).DzSplitter = { Vertical: 1, Horizontal: 2 }
        setLogLevel('trace')
    })

    it('logs dialog objectName and geometry before and after exec', () => {
        new TestDialog('Power Loader', 'Vholf3D Power Loader').run()

        const messages = (globalThis as any).App.debug.mock.calls.map((call: unknown[]) => String(call[0]))

        expect(messages.some((message: string) =>
            message.includes('event=dialog.geometry phase=init') &&
            message.includes('objectName="Vholf3DPowerLoaderDlg"')
        )).toBe(true)
        expect(messages.some((message: string) =>
            message.includes('event=dialog.geometry phase=beforeExec') &&
            message.includes('dialogWidth=300')
        )).toBe(true)
        expect(messages.some((message: string) =>
            message.includes('event=dialog.geometry phase=afterExec') &&
            message.includes('dialogWidth=640') &&
            message.includes('result=true')
        )).toBe(true)
    })

    it('keeps the DAZ geometry objectName stable after building a header widget', () => {
        new HeaderDialog('Power Menu - Active Tool', 'Vholf3D Power Menu - Active Tool').run()

        const messages = (globalThis as any).App.debug.mock.calls.map((call: unknown[]) => String(call[0]))

        expect(messages.some((message: string) =>
            message.includes('event=dialog.geometry phase=afterSetup') &&
            message.includes('objectName="Vholf3DPowerMenu-ActiveToolDlg"')
        )).toBe(true)
        expect(messages.some((message: string) =>
            message.includes('event=dialog.geometry phase=beforeExec') &&
            message.includes('objectName="Vholf3DPowerMenu-ActiveToolDlg"')
        )).toBe(true)
    })

    it('does not freeze a non-resizable dialog to an early implicit size hint', () => {
        new NonResizableDefaultSizeDialog('Store Active Camera').run()

        const messages = (globalThis as any).App.debug.mock.calls.map((call: unknown[]) => String(call[0]))

        expect(messages.some((message: string) =>
            message.includes('event=dialog.geometry phase=afterExec') &&
            message.includes('objectName="StoreActiveCameraDlg"') &&
            message.includes('dialogHeight=76') &&
            message.includes('sizeHintHeight=76')
        )).toBe(true)
    })

    it('keeps explicit non-resizable dialog height fixed', () => {
        new ExplicitFixedHeightDialog('Explicit Height').run()

        const messages = (globalThis as any).App.debug.mock.calls.map((call: unknown[]) => String(call[0]))

        expect(messages.some((message: string) =>
            message.includes('event=dialog.geometry phase=afterExec') &&
            message.includes('objectName="ExplicitHeightDlg"') &&
            message.includes('dialogHeight=35') &&
            message.includes('sizeHintHeight=76')
        )).toBe(true)
    })
})
