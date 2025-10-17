import Set from '@dsf/lib/set';

export const contains = <T>(array: T[], searchElement: T, fromIndex?: number): boolean => {
  if (array == null) {
    throw new TypeError('Array.prototype includes called on null or undefined');
  }

  const O = Object(array);
  const len = O.length >>> 0;

  if (len === 0) {
    return false;
  }

  let k = 0;

  if (fromIndex !== undefined) {
    k = fromIndex | 0;
    k = Math.max(k >= 0 ? k : len - Math.abs(k), 0);
  }

  while (k < len) {
    if (O[k] === searchElement) {
      return true;
    }
    k++;
  }

  return false;
}

export const find = <T>(array: T[], f: (item: T) => boolean): T | null => {
  for (const item of array) {
    if (f(item)) {
      return item
    }
  }
  return null
}

export const distinct = <T>(items: T[], f?: (item: T) => any): T[] => {
  const distinctItems: T[] = [];
  const customSet = new Set<T>();

  for (const item of items) {
    const key = f ? f(item) : item;
    if (!customSet.has(key)) {
      customSet.add(key);
      distinctItems.push(item);
    }
  }

  return distinctItems;
}

/**
 * Adds the item to the array only if it is not already contained
 * @param array
 * @param item
 * @returns
 */
export const append = <T>(array: T[], item: T): T[] => {
  if (!contains(array, item)) {
    array.push(item);
  }
  return array
}

/**
 * @deprecated Probably inefficient, avoid using in performance critical code
 * @param array
 * @returns
 */
export const flattenOld = <T>(array: (T | T[])[]): T[] => {
  const flattened: T[] = [];
  const stack: (T | T[])[] = [...array];

  while (stack.length) {
    const item = stack.pop();
    if (Array.isArray(item)) {
      // If the item is an array, push its contents onto the stack.
      stack.push(...item);
    } else {
      // If the item is not an array, add it to the flattened array.
      flattened.push(item);
    }
  }

  return flattened.reverse(); // Reverse the array to maintain original order.
}

/**
 * Flattens only one level of nested arrays
 * @param array
 * @returns
 */
export const flatten = <T>(array: (T | T[])[]): T[] => {
  const out: T[] = [];
  for (let i = 0; i < array.length; i++) {
    const item = array[i];
    if (Array.isArray(item)) {
      for (let j = 0; j < item.length; j++) {
        out.push(item[j]);
      }
    } else {
      out.push(item);
    }
  }
  return out;
}

export const any = <T>(array: T[], f?: (item: T) => boolean): boolean => {
  if (!f)
    return array.length > 0

  for (const item of array) {
    if (f(item)) {
      return true
    }
  }
  return false;
}

export const moveToTop = <T>(arr: T[], element: T, findBy: (item: T) => string) => {
  const findByValue = findBy(element);
  let index = -1;

  for (let i = 0; i < arr.length; i++) {
    if (findBy(arr[i]) === findByValue) {
      index = i;
      break;
    }
  }

  if (index > -1) {
    const [removed] = arr.splice(index, 1);
    arr.unshift(removed);
    return;
  }
}

export const moveToBottom = <T>(arr: T[], element: T, findBy: (item: T) => string) => {
  const findByValue = findBy(element);
  let index = -1;

  for (let i = arr.length - 1; i >= 0; i--) {
    if (findBy(arr[i]) === findByValue) {
      index = i;
      break;
    }
  }

  if (index > -1) {
    const [removed] = arr.splice(index, 1);
    arr.push(removed);
    return;
  }
}

export const group = <T, K extends string>(array: T[], getKey: (item: T) => K): Record<K, T[]> => {
  let reduced: Record<K, T[]> = array.reduce((previous, currentItem) => {
    let group = getKey(currentItem);
    if (!group) group = "" as K;
    if (!previous[group]) previous[group] = [];
    previous[group].push(currentItem);
    return previous;
  }, {} as Record<K, T[]>);
  return reduced;
}

