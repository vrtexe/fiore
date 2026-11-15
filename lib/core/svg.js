import { tagsByName } from './tag.js';

/** @import { SVGTag } from '../types/svg.dom.d.ts' */

const NS = 'http://www.w3.org/2000/svg';

const byName = tagsByName((name) => document.createElementNS(NS, name));

/**
 * Returns the tag of any SVG element by name, the same tag function on every call.
 * @template {keyof SVGElementTagNameMap} T
 * @param {T} name
 * @returns {SVGTag<T>}
 */
export function svgElement(name) {
  // @ts-expect-error the tag function implements SVGTag
  return byName(name);
}
