/** Helpers that know nothing about the DOM or live values. */
/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
export function isPlainObject(value: unknown): value is Record<string, unknown>;
/**
 * @param {unknown} value
 * @returns {value is string | number | bigint}
 */
export function isText(value: unknown): value is string | number | bigint;
/**
 * Flattens nested arrays with a stack instead of recursion, so very deep arrays cannot overflow it. An array met again
 * inside itself is skipped, so a cyclic array, for example from structured-cloned data, cannot loop forever.
 * @param {unknown} value
 * @returns {unknown[]}
 */
export function flatten(value: unknown): unknown[];
/**
 * Returns the positions of a longest increasing subsequence of the non-negative values: the nodes that can stay.
 * The scan runs from the end, so among equally long runs the one nearest the end stays; a reversed list then moves
 * the nodes that are cheapest to move.
 * @param {number[]} values
 * @returns {Set<number>}
 */
export function increasingRun(values: number[]): Set<number>;
