function objectEntries(obj: any) {
    const ownProps = Object.keys(obj);
    let i = ownProps.length;
    const result = new Array(i); // preallocate the Array
    while (i--) {
        result[i] = [ownProps[i], obj[ownProps[i]]];
    }
    return result;
};

export function entries<K extends string, T>(
    record: Record<K, T[]>
): Array<[K, T[]]> {
    return (objectEntries(record) as Array<[K, T[]]>);
}

