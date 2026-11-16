/** Helpers that know nothing about the DOM or live values. */

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
export function isPlainObject(value) {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * @param {unknown} value
 * @returns {value is string | number | bigint}
 */
export function isText(value) {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint';
}

/** Marks on the stack where the items of an array end, so the array leaves the set of open arrays. */
const END = Symbol('end');

/**
 * Flattens nested arrays with a stack instead of recursion, so very deep arrays cannot overflow it. An array met again
 * inside itself is skipped, so a cyclic array, for example from structured-cloned data, cannot loop forever.
 * @param {unknown} value
 * @returns {unknown[]}
 */
export function flatten(value) {
  /** @type {unknown[]} */
  const items = [];
  /** @type {Set<unknown>} */
  const open = new Set();
  /** @type {unknown[]} */
  const stack = [value];
  while (stack.length > 0) {
    const item = stack.pop();
    if (item === END) {
      open.delete(stack.pop());
    } else if (Array.isArray(item)) {
      if (!open.has(item)) {
        open.add(item);
        stack.push(item, END);
        for (let i = item.length - 1; i >= 0; i--) {
          stack.push(item[i]);
        }
      }
    } else {
      items.push(item);
    }
  }
  return items;
}

/**
 * Returns the positions of a longest increasing subsequence of the non-negative values: the nodes that can stay.
 * The scan runs from the end, so among equally long runs the one nearest the end stays; a reversed list then moves
 * the nodes that are cheapest to move.
 * @param {number[]} values
 * @returns {Set<number>}
 */
export function increasingRun(values) {
  /** @type {number[]} */
  const tails = [];
  /** @type {number[]} */
  const following = new Array(values.length).fill(-1);
  for (let i = values.length - 1; i >= 0; i--) {
    const value = /** @type {number} */ (values[i]);
    if (value < 0) {
      continue;
    }
    let low = 0;
    let high = tails.length;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (/** @type {number} */ (values[/** @type {number} */ (tails[middle])]) > value) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }
    following[i] = low > 0 ? /** @type {number} */ (tails[low - 1]) : -1;
    tails[low] = i;
  }

  const run = new Set();
  let i = tails.at(-1) ?? -1;
  while (i >= 0) {
    run.add(i);
    i = following[i] ?? -1;
  }
  return run;
}
