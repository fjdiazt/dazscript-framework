export class Observable<T> {
    protected _value: T;
    private _beforeChange?: (previous: T, current: T) => T;
    private _afterChange?: (previous: T, current: T) => T;
    private _onChange: Array<(value: T) => void> = [];
    private _paused = false;

    // NEW: guards + comparator
    private _isSetting = false;
    private _pendingValue?: T; // last requested value during an active set
    private _equals: (a: T, b: T) => boolean;
    private static readonly MAX_AFTER_CHANGE_DEPTH = 10;
    private static readonly MAX_CHAINED_SETS = 100; // limit for cascading listener-driven sets

    constructor(value?: T, onChange?: (value: T) => void, equals?: (a: T, b: T) => boolean) {
        this._value = value as T;
        if (onChange) this._onChange.push(onChange);
        this._equals = equals ?? ((a, b) => a === b);
    }

    get value(): T { return this._value; }

    set value(next: T) {
        // Coalesce: if actively setting, just remember the latest requested value.
        if (this._isSetting) { this._pendingValue = next; return; }

        let currentRequested: T | undefined = next;
        let chainedSets = 0;
        let afterDepth = 0;

        while (currentRequested !== undefined) {
            const prev = this._value;
            let candidate = this._beforeChange?.(prev, currentRequested) ?? currentRequested;
            currentRequested = undefined; // consume

            if (this._equals(prev, candidate)) {
                // No actual change; ignore any pending identical value.
                this._pendingValue = undefined;
                break;
            }

            this._isSetting = true;
            this._value = candidate;
            if (!this._paused) this._onChange.slice().forEach(cb => cb(this._value));

            // Apply afterChange transformations (bounded)
            let transformed = this._afterChange?.(prev, this._value);
            while (transformed !== undefined && !this._equals(this._value, transformed)) {
                afterDepth++;
                if (afterDepth > Observable.MAX_AFTER_CHANGE_DEPTH) {
                    this._isSetting = false;
                    this._pendingValue = undefined;
                    throw new Error(`Observable: _afterChange exceeded depth ${Observable.MAX_AFTER_CHANGE_DEPTH}. Possible loop.`);
                }
                this._value = transformed;
                if (!this._paused) this._onChange.slice().forEach(cb => cb(this._value));
                transformed = this._afterChange?.(prev, this._value);
            }

            this._isSetting = false;

            // If a listener requested a new value during this cycle, process it
            if (this._pendingValue !== undefined && !this._equals(this._value, this._pendingValue)) {
                currentRequested = this._pendingValue;
                this._pendingValue = undefined;
                chainedSets++;
                if (chainedSets > Observable.MAX_CHAINED_SETS) {
                    throw new Error(`Observable: Too many chained set operations (>${Observable.MAX_CHAINED_SETS}). Possible loop.`);
                }
            } else {
                // Either no pending or it's same-value;
                this._pendingValue = undefined;
            }
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
    private _isUpdatingFromCombined = false;

    combine(...observables: BooleanObservable[]): this {
        observables.forEach(obs => {
            // Prevent circular references
            if (obs === this) {
                throw new Error('BooleanObservable: Cannot combine with itself');
            }

            this.combined.push(obs);
            obs.connect(() => {
                // Prevent circular updates
                if (this._isUpdatingFromCombined) return;

                this._isUpdatingFromCombined = true;
                try {
                    this.value = this.combined.every(b => b.value);
                } finally {
                    this._isUpdatingFromCombined = false;
                }
            });
        });
        // initialize once
        this._isUpdatingFromCombined = true;
        try {
            this.value = this.combined.every(b => b.value);
        } finally {
            this._isUpdatingFromCombined = false;
        }
        return this;
    }
}

