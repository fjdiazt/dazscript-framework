export class TreeNode<T = null> {
    name: string;
    value: T | null;
    path: string = '';
    parent: TreeNode<T> | null = null;
    private _children: TreeNode<T>[] = [];

    constructor(name: string, path: string, value: T | null = null, children: TreeNode<T>[] = []) {
        this.name = name;
        this.path = path;
        this.value = value;
        this.addChild(...children)
    }

    addChild(...children: TreeNode<T>[]) {
        children.forEach(child => child.parent = this)
        this._children.push(...children)
    }

    get children(): TreeNode<T>[] {
        return this._children
    }

    get isRoot(): boolean {
        return !this.parent;
    }

    get isLeaf(): boolean {
        return this._children.length === 0;
    }

    first(fn: (node: TreeNode<T>) => boolean): TreeNode<T> | null {
        if (fn(this)) {
            return this;
        }

        for (const child of this._children) {
            const result = child.first(fn);
            if (result !== null) {
                return result;
            }
        }

        return null;
    }

    forEach(fn: (node: TreeNode<T>) => void) {
        fn(this)
        for (const child of this._children) {
            child.forEach(fn)
        }
    }

    values(): (T | null)[] {
        let result: (T | null)[] = [];

        // Add the current node's value to the result
        result.push(this.value);

        // Recursively add values from children
        for (const child of this.children) {
            result = result.concat(child.values());
        }

        return result.filter(value => value !== null) as (T | null)[];
    }

    toJSON(): object {
        return {
            name: this.name,
            path: this.path,
            value: this.value,
            isLeaf: this.isLeaf,
            children: this._children
        };
    }

    static fromJSON<T>(data: TreeNode<T>): TreeNode<T> {
        const { name, path, value, children } = data;
        const node = new TreeNode<T>(name, path, value);
        if (children && children.length > 0) {
            const parsedChildren = children.map((childData) => TreeNode.fromJSON<T>(childData));
            node.addChild(...parsedChildren);
        }
        return node;
    }
}

// getPaths(): string[] {
//     let paths: string[] = [];

//     const traverse = (node: TreeNode<T>) => {
//         if (node.isLeaf) {
//             paths.push(node.path);
//         } else {
//             for (let child of node.children) {
//                 traverse(child);
//             }
//         }
//     };

//     traverse(this);
//     return paths;
// }

// getPartialPaths(keyProperty?: keyof TreeNode<T>): string[] {
//     let key = String(keyProperty ?? "name");
//     let paths: string[] = [];

//     const traverse = (node: TreeNode<T>, path: string) => {
//         path += "/" + node[key];
//         if (node.isLeaf) {
//             paths.push(path);
//         } else {
//             for (let child of node.children) {
//                 traverse(child, path);
//             }
//         }
//     };

//     traverse(this, '');
//     return paths;
// }

// find(path: string): TreeNode<T> | null {
//     // Start with this node
//     let stack: TreeNode<T>[] = [this];

//     // While there are nodes left to check
//     while (stack.length > 0) {
//         let node = stack.pop();

//         // If this node's path matches the path, return it
//         if (node.path === path) {
//             return node;
//         }

//         // Add this node's children to the stack to be checked
//         stack.push(...node.children);
//     }

//     // If no node was found with a matching path, return null
//     return null;
// }

