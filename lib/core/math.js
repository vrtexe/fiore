import { tag, tagsByName } from './tag.js';

/** @import { MathTag } from '../types/math.dom.d.ts' */

const NS = 'http://www.w3.org/1998/Math/MathML';

/**
 * @template {keyof MathMLElementTagNameMap} T
 * @param {T} name
 * @returns {MathTag<T>}
 */
export function mathTag(name) {
  // @ts-expect-error the tag function implements MathTag
  return tag(() => document.createElementNS(NS, name));
}

const byName = tagsByName((name) => document.createElementNS(NS, name));

/**
 * Returns the tag of any MathML element by name, the same tag function on every call.
 * @template {keyof MathMLElementTagNameMap} T
 * @param {T} name
 * @returns {MathTag<T>}
 */
export function mathElement(name) {
  // @ts-expect-error the tag function implements MathTag
  return byName(name);
}
