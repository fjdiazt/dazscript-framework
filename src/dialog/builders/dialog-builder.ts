import { DialogProperties } from '../shared';
import { WidgetBuilderContext, WidgetsBuilder } from './widgets-builder';

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
        setup()
        this.restoreObjectName()
        this.resize()
        this.restoreObjectName()
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
        let hasExplicitHeight = this.properties.height !== undefined;
        let height = this.properties.height;
        if (height !== undefined && maxHeight !== undefined && height > maxHeight) height = maxHeight;

        if (maxHeight !== undefined) {
            this.context.dialog.minHeight = Math.min(sizeHint.height, maxHeight);
        }
        else if (height !== undefined) {
            this.context.dialog.minHeight = height;
        }

        if (height !== undefined) this.context.dialog.height = height;

        if (this.properties.width) this.context.dialog.width = this.properties.width;
        if (this.properties.maxWidth !== undefined) this.context.dialog.maxWidth = this.properties.maxWidth;
        if (maxHeight !== undefined) this.context.dialog.maxHeight = maxHeight;

        if (this.properties.resizable === true) {
            this.context.dialog.sizeGripEnabled = true;
        }
        else {
            if (this.properties.width)
                this.context.dialog.setFixedWidth(this.properties.width);
            if (hasExplicitHeight && height !== undefined)
                this.context.dialog.setFixedHeight(height);
        }
    }
}
