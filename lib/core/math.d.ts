/**
 * Returns the tag of any MathML element by name, the same tag function on every call.
 * @template {keyof MathMLElementTagNameMap} T
 * @param {T} name
 * @returns {MathTag<T>}
 */
export function mathElement<T extends keyof MathMLElementTagNameMap>(name: T): MathTag<T>;
import type { MathTag } from '../types/math.dom.d.ts';
