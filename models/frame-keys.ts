import { find } from '@dsf/helpers/array-helper';

export class PropertyKey {
    index: number
    frame: number = 0
    time: DzTime
    value: number

    toJSON(): Object {
        return {
            index: this.index,
            time: this.time.valueOf(),
            frame: this.frame,
            value: this.value,
        }
    }
}

export class PropertyKeys {
    constructor(private _items: PropertyKey[]) {
        if (!this._items) this._items = [];
    }

    forEach(callback: (key: PropertyKey) => any) {
        this._items.forEach(key => {
            callback(key);
        });
    }

    get items(): PropertyKey[] {
        return this._items;
    }

    get first(): PropertyKey | null {
        return this._items[0]
    }

    get length(): number {
        return this._items.length;
    }

    get current(): PropertyKey {
        return find(this._items, k => k.time.valueOf() == Scene.getTime().valueOf())
    }

    get previous(): PropertyKey {
        return find(this._items.sort((a, b) => b.index - a.index), k => k.time.valueOf() < Scene.getTime().valueOf())
    }

    get next(): PropertyKey {
        return find(this._items, k => k.time.valueOf() > Scene.getTime().valueOf())
    }

    /**
     * Given the animation frame number or time, return the property key
     * @param frameorTime frame number or time
     * @returns the property key
     */
    at(frameorTime: number | DzTime): PropertyKey | null {
        return typeof frameorTime === 'number'
            ? find(this._items, k => k.frame === frameorTime)
            : find(this._items, k => k.time === frameorTime)
    }

    any(): boolean {
        return this.items.length > 0
    }
}