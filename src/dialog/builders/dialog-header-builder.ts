import LayoutBuilder from './layout-builder'
import { createWidget } from './widget-builder'
import { WidgetBuilderContext } from './widgets-builder'

export type DialogHeaderOptions = {
    image?: Pixmap
    imagePath?: string
    imageWidth?: number
    height?: number
    html?: string
    text?: string
}

const escapeHtml = (value: string): string =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/\r?\n/g, '<br>')

export class DialogHeaderBuilder {
    constructor(
        private readonly context: WidgetBuilderContext,
        private readonly options: DialogHeaderOptions
    ) { }

    build(): DzHBoxLayout {
        const height = this.options.height ?? 96
        const imageWidth = this.options.imageWidth ?? height
        const html = this.options.html ?? (
            typeof this.options.text === 'string'
                ? escapeHtml(this.options.text)
                : ''
        )

        return LayoutBuilder
            .create(this.context)
            .direction('horizontal')
            .build(() => {
                this.buildImage(height, imageWidth)
                this.buildText(html, height)
            }) as DzHBoxLayout
    }

    private buildImage(height: number, imageWidth: number): void {
        const pixmap = this.options.image ?? (
            this.options.imagePath ? new Pixmap(this.options.imagePath) : null
        )
        if (!pixmap) return

        createWidget(this.context).build(DzLabel, (label) => {
            label.pixmap = pixmap
            label.scaledContents = true
            label.setFixedWidth(imageWidth)
            label.setFixedHeight(height)
        })
    }

    private buildText(html: string, height: number): void {
        if (!html) return

        createWidget(this.context).build(DzTextBrowser, (textBrowser) => {
            textBrowser.html = html
            textBrowser.readOnly = true
            textBrowser.lineWrapMode = DzTextEdit.WidgetWidth
            textBrowser.wordWrapMode = DzTextEdit.WordWrap
            textBrowser.setFixedHeight(height)
        })
    }
}
