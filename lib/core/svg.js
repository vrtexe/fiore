import { tag } from './tag.js';

/** @import { SVGTag } from '../types/svg.dom.d.ts' */

/**
 * Returns the tag of any SVG element by name.
 * @template {keyof SVGElementTagNameMap} T
 * @param {T} name
 * @returns {SVGTag<T>}
 */
export function svgElement(name) {
  return tag('http://www.w3.org/2000/svg', name);
}
