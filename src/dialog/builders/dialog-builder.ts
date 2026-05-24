import { DialogProperties } from '../shared';
import { WidgetBuilderContext, WidgetsBuilder } from './widgets-builder';
import { debug } from '@dsf/common/log';

export class DialogBuilder extends WidgetsBuilder {
    public properties: DialogProperties
    private objectName: string

    constructor(private title: string, private id?: string) {
        super(new WidgetBuilderContext(new DzBasicDialog()))
        this.properties = new DialogProperties()
    }

    options(properties: DialogProperties) {
        this.properties = properties
    }

    build(setup: () => void): DzBasicDialog {
        this.init()
        this.traceGeometry('init')
        setup()
        this.restoreObjectName()
        this.traceGeometry('afterSetup')
        this.resize()
        this.restoreObjectName()
        this.traceGeometry('afterResize')
        return this.context.dialog
    }

    private init() {
        this.context.dialog.caption = this.title
        this.objectName = (this.id ?? this.context.dialog.caption).replace(/ /g, "") + "Dlg"
        this.restoreObjectName()
    }

    restoreObjectName() {
        if (!this.objectName) return
        this.context.dialog.getWidget().objectName = this.objectName
    }

    private resize() {
        let dialogWidget = this.context.dialog.getWidget();
        let sizeHint = dialogWidget.minimumSizeHint;
        let maxHeight = this.properties.maxHeight;
        let height = this.properties.height ?? sizeHint.height;
        if (maxHeight !== undefined && height > maxHeight) height = maxHeight;
        this.context.dialog.minHeight = maxHeight !== undefined
            ? Math.min(sizeHint.height, maxHeight)
            : sizeHint.height;
        this.context.dialog.height = height;

        if (this.properties.width) this.context.dialog.width = this.properties.width;
        if (this.properties.maxWidth !== undefined) this.context.dialog.maxWidth = this.properties.maxWidth;
        if (maxHeight !== undefined) this.context.dialog.maxHeight = maxHeight;

        if (this.properties.resizable === true) {
            this.context.dialog.sizeGripEnabled = true;
        }
        else {
            if (this.properties.width)
                this.context.dialog.setFixedWidth(this.properties.width);
            this.context.dialog.setFixedHeight(height);
        }
    }

    traceGeometry(phase: string, extra: { [key: string]: string | number | boolean | undefined } = {}) {
        let dialog = this.context.dialog
        let dialogWidget = dialog.getWidget()
        let objectName = this.read(dialogWidget, 'objectName')
        let caption = this.read(dialog, 'caption')
        let sizeHint = this.read(dialogWidget, 'minimumSizeHint')
        let key = objectName ?? ''
        let fields: { [key: string]: string | number | boolean | undefined } = {
            event: 'dialog.geometry',
            phase,
            title: this.title,
            id: this.id ?? '',
            caption,
            objectName,
            windowGeometryKey: key,
            dialogX: this.read(dialog, 'x'),
            dialogY: this.read(dialog, 'y'),
            dialogWidth: this.read(dialog, 'width'),
            dialogHeight: this.read(dialog, 'height'),
            widgetX: this.read(dialogWidget, 'x'),
            widgetY: this.read(dialogWidget, 'y'),
            widgetWidth: this.read(dialogWidget, 'width'),
            widgetHeight: this.read(dialogWidget, 'height'),
            sizeHintWidth: this.read(sizeHint, 'width'),
            sizeHintHeight: this.read(sizeHint, 'height'),
            propertyWidth: this.properties.width,
            propertyHeight: this.properties.height,
            propertyMaxWidth: this.properties.maxWidth,
            propertyMaxHeight: this.properties.maxHeight,
            resizable: this.properties.resizable === true,
            registrySubKey: key ? `WindowGeometries\\${key}` : ''
        }

        Object.keys(extra).forEach((name) => fields[name] = extra[name])
        debug(`[DialogGeometry] ${this.formatGeometryTrace(fields)}`)
    }

    private read(source: any, field: string): any {
        if (!source) return undefined
        try {
            return source[field]
        }
        catch (err) {
            return undefined
        }
    }

    private formatGeometryTrace(fields: { [key: string]: string | number | boolean | undefined }): string {
        return Object.keys(fields)
            .filter((name) => fields[name] !== undefined)
            .map((name) => `${name}=${this.formatGeometryValue(name, fields[name])}`)
            .join(' ')
    }

    private formatGeometryValue(name: string, value: string | number | boolean | undefined): string {
        if (name === 'event' || name === 'phase') return String(value)
        if (typeof value === 'string') return JSON.stringify(value)
        return String(value)
    }
}
