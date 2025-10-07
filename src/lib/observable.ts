export class Observable<T> {
    protected _value: T;
    private _beforeChange?: (previous: T, current: T) => T;
    private _afterChange?: (previous: T, current: T) => T;
    private _onChange: Array<(value: T) => void> = [];
    private _paused = false;

    // NEW: guards + comparator
    private _isSetting = false;
    private _hasPending = false;
    private _pendingValue?: T;
    private _equals: (a: T, b: T) => boolean;

    constructor(value?: T, onChange?: (value: T) => void, equals?: (a: T, b: T) => boolean) {
        this._value = value as T;
        if (onChange) this._onChange.push(onChange);
        this._equals = equals ?? ((a, b) => a === b);
    }

    get value(): T { return this._value; }

    set value(next: T) {
        // Coalesce re-entrant sets
        if (this._isSetting) { this._hasPending = true; this._pendingValue = next; return; }

        const prev = this._value;
        next = this._beforeChange?.(prev, next) ?? next;
        if (this._equals(prev, next)) return;

        this._isSetting = true;
        this._value = next;

        if (!this._paused) this._onChange.slice().forEach(cb => cb(this._value));

        const after = this._afterChange?.(prev, this._value);
        if (after !== undefined && !this._equals(this._value, after)) {
            this._value = after;
        }

        this._isSetting = false;

        // If any callback tried to set again, process the last pending set
        if (this._hasPending) {
            const p = this._pendingValue as T;
            this._hasPending = false;
            this._pendingValue = undefined;
            this.value = p; // safe: guard handles it
        }
    }

    connect(onChange: (value: T) => void): this {
        if (this._onChange.indexOf(onChange) === -1) this._onChange.push(onChange);
        return this;
    }

    intercept(
        beforeChange: (previous: T, current: T) => T,
        afterChange?: (previous: T, current: T) => T
    ): this {
        this._beforeChange = beforeChange;
        this._afterChange = afterChange;
        return this;
    }

    disconnect(onChange: (value: T) => void) {
        const i = this._onChange.indexOf(onChange);
        if (i > -1) this._onChange.splice(i, 1);
    }

    trigger(): void {
        if (!this._paused) this._onChange.slice().forEach(cb => cb(this._value));
    }

    pause(callback?: () => void): void {
        this._paused = true;
        callback?.();
        this.resume();
    }
    resume(): void { this._paused = false; }

    // Optional: silent set (no callbacks) for derived/computed cases
    setSilently(next: T): void { this._value = next; }

    toJSON() { return this._value; }
}

export class BooleanObservable extends Observable<boolean> {
    private combined: BooleanObservable[] = [];

    combine(...observables: BooleanObservable[]): this {
        observables.forEach(obs => {
            this.combined.push(obs);
            obs.connect(() => {
                this.value = this.combined.every(b => b.value);
            });
        });
        // initialize once
        this.value = this.combined.every(b => b.value);
        return this;
    }
}

