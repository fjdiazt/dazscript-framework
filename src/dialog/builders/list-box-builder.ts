import { Dictionary } from '@dsf/lib/dictionary';
import { Observable } from '@dsf/lib/observable';
import { createWidget, WidgetBuilderBase } from './widget-builder';
import { WidgetBuilderContext } from './widgets-builder';

export class ListBoxBuilder extends WidgetBuilderBase<DzListBox> {
    private _items: Dictionary<number, string> | null = null
    private _mode: 'single' | 'multi' | 'extended' = 'single'

    constructor(context: WidgetBuilderContext) {
        super(createWidget(context).build(DzListBox))
    }

    items(items$: string[] | Observable<string[]>): this {
        this.widget.clear()
        if (items$ instanceof Observable) {
            this._items = {}
            items$.value.forEach((item, idx) => {
                this._items[idx] = item
            })

            const setItems = (items: string[]) => {
                this.widget.clear()
                items.forEach((item, idx) => {
                    this.widget.insertItem(item)
                })
            }

            setItems(items$.value)
            items$.connect(value => {
                this.widget.clear()
                setItems(value)
            })
        }
        else {
            this._items = {}
            items$.forEach((item, idx) => {
                this._items[idx] = item
                this.widget.insertItem(item)
            })
        }

        return this
    }

    mode(mode: 'single' | 'multi' | 'extended'): this {
        this._mode = mode
        switch (mode) {
            case 'single':
                this.widget.selectionMode = DzListBox.Single
                break
            case 'multi':
                this.widget.selectionMode = DzListBox.Multi
                break
            case 'extended':
                this.widget.selectionMode = DzListBox.Extended
                break
        }
        return this
    }

    selected(selected$: Observable<string[]>): this {
        const setSelected = (selected: string[] | null) => {
            this.widget.clearSelection()
            if (selected$.value?.length > 0 && this._items) {
                selected.forEach(sel => {
                    const idx = Object.keys(this._items)
                        .map(key => this._items[Number(key)])
                        .indexOf(sel)
                    if (idx >= 0) {
                        this.widget.setSelected(idx, true)
                    }
                })
            }
        }

        this.widget.currentChanged.scriptConnect((idx) => {
            if (!selected$ || !this._items) return
            if (this._mode === 'single') {
                const item = this._items[idx]
                selected$.value = item ? [item] : []
            }
            else {
                selected$.value = Object.keys(this._items)
                    .map(key => this.widget.isSelected(Number(key)) ? this._items[Number(key)] : null)
                    .filter((item): item is string => item !== null)
            }
        })

        if (selected$.value?.length === 0) {
            return this
        }

        setSelected(selected$.value)

        return this
    }

    build(then?: (listBox: DzListBox) => void) {
        then?.(this.widget)
        return this.widget
    }
}