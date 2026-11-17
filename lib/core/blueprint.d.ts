/** @import { Recorded } from './base.js' */
/**
 * @typedef {Recorded & { steps: number[] }} Slot
 * @typedef {{ root: Node, slots: Slot[] }} Prepared
 */
/**
 * A structure built once and cloned for every call. `build` gets `slot`, whose properties are placeholders: put
 * `slot.name` where a value of the call goes, as a prop, an attribute, a child or a listener. The first call runs
 * `build` and records where each placeholder lands; every call clones the result with one `cloneNode` and puts the
 * values of `values` in those places, signals bound as usual. The structure is the same for every call, so `build`
 * must not depend on the values, and everything that varies goes through a slot.
 * @template {Node} N
 * @param {(slot: Record<string, any>) => N} build
 * @returns {(values: Record<string, unknown>) => N}
 */
export function blueprint<N extends Node>(build: (slot: Record<string, any>) => N): (values: Record<string, unknown>) => N;
export type Slot = Recorded & {
    steps: number[];
};
export type Prepared = {
    root: Node;
    slots: Slot[];
};
import type { Recorded } from './base.js';
