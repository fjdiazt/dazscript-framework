import { DialogProperties } from '../shared';
import { WidgetBuilderContext, WidgetsBuilder } from './widgets-builder';

export class DialogBuilder extends WidgetsBuilder {
    public properties: DialogProperties

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
        this.resize()
        return this.context.dialog
    }

    private init() {
        this.context.dialog.caption = this.title
        let dialogWidget = this.context.dialog.getWidget()
        var key = (this.id ?? this.context.dialog.caption).replace(/ /g, "") + "Dlg"
        dialogWidget.objectName = key
    }

    private resize() {
        let dialogWidget = this.context.dialog.getWidget();
        let sizeHint = dialogWidget.minimumSizeHint;
        let height = this.properties.height ?? sizeHint.height;
        this.context.dialog.minHeight = sizeHint.height;
        this.context.dialog.height = height;

        if (this.properties.width) this.context.dialog.width = this.properties.width;

        if (this.properties.resizable === true) {
            this.context.dialog.sizeGripEnabled = true;
        }
        else {
            if (this.properties.width)
                this.context.dialog.setFixedWidth(this.properties.width);
            this.context.dialog.setFixedHeight(height);
        }
    }
}

