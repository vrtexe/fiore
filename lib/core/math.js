import { tag } from './tag.js';

/** @import { MathTag } from '../types/math.dom.d.ts' */

/**
 * Returns the tag of any MathML element by name.
 * @template {keyof MathMLElementTagNameMap} T
 * @param {T} name
 * @returns {MathTag<T>}
 */
export function mathElement(name) {
  return tag('http://www.w3.org/1998/Math/MathML', name);
}
