import { Builder, tag } from './builder.js';

/** @import { Callback, Ref } from './builder.js' */
/** @import { SVGElementEventData, SVGTag } from '../types/svg.dom.d.ts' */
/** @import { HTMLElementsAttributesMap } from '../types/attributes.d.ts' */

/**
 * Returns the tag of any SVG element by name.
 * @template {keyof SVGElementTagNameMap} K
 * @param {K} name
 * @returns {SVGTag<K>}
 */
export function svgElement(name) {
  return tag(new SVGBuilder(name));
}

/**
 * Builds SVG elements.
 * @template {keyof SVGElementTagNameMap} K
 * @extends {Builder<SVGElementTagNameMap[K], HTMLElementsAttributesMap[K], SVGElementEventData<SVGElementTagNameMap[K]>>}
 */
export class SVGBuilder extends Builder {
  #name;

  /**
   * @param {K} name
   * @param {object} [props]
   * @param {object} [attrs]
   * @param {readonly object[]} [on]
   * @param {readonly (Callback<SVGElementTagNameMap[K]> | Ref<any>)[]} [also]
   */
  constructor(name, props, attrs, on, also) {
    super(props, attrs, on, also);
    this.#name = name;
  }

  /** @override */
  make() {
    return document.createElementNS('http://www.w3.org/2000/svg', this.#name);
  }

  /**
   * @param {object} [props]
   * @param {object} [attrs]
   * @param {readonly object[]} [on]
   * @param {readonly (Callback<SVGElementTagNameMap[K]> | Ref<any>)[]} [also]
   * @override
   */
  next(props, attrs, on, also) {
    return new SVGBuilder(this.#name, props, attrs, on, also);
  }
}
