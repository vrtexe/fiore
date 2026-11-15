/** @import { SVGTag } from '../types/svg.dom.d.ts' */
/**
 * Returns the tag of any SVG element by name.
 * @template {keyof SVGElementTagNameMap} T
 * @param {T} name
 * @returns {SVGTag<T>}
 */
export function svgElement<T extends keyof SVGElementTagNameMap>(name: T): SVGTag<T>;
import type { SVGTag } from '../types/svg.dom.d.ts';
