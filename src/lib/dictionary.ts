export type Dictionary<K extends string | number | symbol, V> = {
    [P in K]: V;
};