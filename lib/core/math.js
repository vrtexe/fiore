import { Builder, tag } from './builder.js';

/** @import { Callback } from './builder.js' */
/** @import { MathElementEventData, MathElementTagNameMap, MathTag } from '../types/math.dom.d.ts' */
/** @import { HTMLElementsAttributesMap } from '../types/attributes.d.ts' */

/**
 * Returns the tag of any MathML element by name.
 * @template {keyof MathElementTagNameMap} K
 * @param {K} name
 * @returns {MathTag<K>}
 */
export function mathElement(name) {
  return tag(new MathBuilder(name));
}

/**
 * Builds MathML elements.
 * @template {keyof MathElementTagNameMap} K
 * @extends {Builder<MathElementTagNameMap[K], HTMLElementsAttributesMap[K], MathElementEventData<MathElementTagNameMap[K]>>}
 */
export class MathBuilder extends Builder {
  #name;

  /**
   * @param {K} name
   * @param {object} [props]
   * @param {object} [attrs]
   * @param {readonly object[]} [on]
   * @param {readonly Callback<MathElementTagNameMap[K]>[]} [also]
   */
  constructor(name, props, attrs, on, also) {
    super(props, attrs, on, also);
    this.#name = name;
  }

  /** @override */
  make() {
    return document.createElementNS('http://www.w3.org/1998/Math/MathML', this.#name);
  }

  /**
   * @param {object} [props]
   * @param {object} [attrs]
   * @param {readonly object[]} [on]
   * @param {readonly Callback<MathElementTagNameMap[K]>[]} [also]
   * @override
   */
  next(props, attrs, on, also) {
    return new MathBuilder(this.#name, props, attrs, on, also);
  }
}
