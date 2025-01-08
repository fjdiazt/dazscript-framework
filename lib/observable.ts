export class Observable<T> {
    protected _value: T;
    private _beforeChange: (previous: T, current: T) => T
    private _onChange: Array<(value: T) => void> = []
    private _afterChange: (previous: T, current: T) => T
    private _paused: boolean

    constructor(value?: T, onChange?: (value: T) => void) {
        this.value = value;
        if (onChange)
            this._onChange.push(onChange);
    }

    get value(): T {
        return this._value;
    }

    set value(value: T) {
        let previous = this._value
        this._value = this._beforeChange?.(this._value, value) ?? value
        if (!this._paused) this.trigger()
        this._value = this._afterChange?.(previous, this._value) ?? this._value
    }

    connect(onChange: (value: T) => void): this {
        if (this._onChange.indexOf(onChange) === -1) {
            this._onChange.push(onChange)
        }
        return this
    }

    intercept(beforeChange: (previous: T, current: T) => T, afterChange?: (previous: T, current: T) => T): this {
        this._beforeChange = beforeChange
        this._afterChange = afterChange
        return this
    }

    disconnect(onChange: (value: T) => void) {
        const index = this._onChange.indexOf(onChange);
        if (index > -1) {
            this._onChange.splice(index, 1);
        }
    }

    trigger(): void {
        if (!this._paused)
            this._onChange.forEach(callback => callback(this._value));
    }

    pause(callback?: () => void): void {
        this._paused = true
        callback?.()
        this.resume()
    }

    resume(): void {
        this._paused = false
    }

    toJSON() {
        return this._value;
    }
}

export class BooleanObservable extends Observable<boolean> {
    private combined: BooleanObservable[] = []

    combine(...observables: BooleanObservable[]): this {
        observables.forEach((obs) => {
            this.combined.push(obs)
            obs.connect(_ => {
                this._value = this.combined.every(b => b.value)
            })
        })
        return this
    }
}


// export class ObservableNumber extends Observable<number> {
//     setMax(max: number): this {
//         this.connect((value) => {
//             if (value > max) value = max
//         })
//         return this
//     }

//     setMin(min: number): this {
//         this.connect((value) => {
//             if (value < min) value = min
//         })
//         return this
//     }
// }