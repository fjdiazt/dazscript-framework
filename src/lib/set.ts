export default class CustomSet<T> {
    private items: Record<string, T> = {};

    add(item: T): void {
        const key = this.getKey(item);
        this.items[key] = item;
    }

    has(item: T): boolean {
        const key = this.getKey(item);
        return key in this.items;
    }

    remove(item: T): void {
        const key = this.getKey(item);
        delete this.items[key];
    }

    clear(): void {
        this.items = {};
    }

    forEach(callback: (item: T) => void): void {
        for (const key in this.items) {
            if (this.items.hasOwnProperty(key)) {
                callback(this.items[key]);
            }
        }
    }

    private getKey(item: T): string {
        if (typeof item === 'object') {
            // For object items, use a unique identifier (e.g., JSON string) as the key
            return JSON.stringify(item);
        }
        return String(item);
    }

    values(): T[] {
        return Object.values(this.items);
    }
}
