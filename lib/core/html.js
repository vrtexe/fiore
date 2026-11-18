import { Builder, tag } from './builder.js';

/** @import { Callback } from './builder.js' */
/** @import { CustomElementTag, DeprecatedHTMLTag, ElementEventData, HTMLTag } from '../types/html.dom.d.ts' */
/** @import { HTMLElementsAttributesMap } from '../types/attributes.d.ts' */

/**
 * Returns the tag of any HTML element by name.
 * @template {keyof HTMLElementTagNameMap} K
 * @overload
 * @param {K} name
 * @returns {HTMLTag<K>}
 */
/**
 * Returns the tag of a custom element, whose name has a hyphen; it takes any attribute.
 * @overload
 * @param {`${string}-${string}`} name
 * @returns {CustomElementTag}
 */
/**
 * @param {string} name
 * @returns {HTMLTag<keyof HTMLElementTagNameMap> | CustomElementTag}
 */
export function element(name) {
  return tag(new HTMLBuilder(/** @type {keyof HTMLElementTagNameMap} */ (name)));
}

/**
 * @deprecated
 * @template {keyof HTMLElementDeprecatedTagNameMap} K
 * @param {K} name
 * @returns {DeprecatedHTMLTag<K>}
 */
export function deprecatedElement(name) {
  return tag(new DeprecatedHTMLBuilder(name));
}

/**
 * Builds HTML elements.
 * @template {keyof HTMLElementTagNameMap} K
 * @extends {Builder<HTMLElementTagNameMap[K], HTMLElementsAttributesMap[K], ElementEventData<HTMLElementTagNameMap[K]>>}
 */
export class HTMLBuilder extends Builder {
  #name;

  /**
   * @param {K} name
   * @param {object} [props]
   * @param {object} [attrs]
   * @param {readonly object[]} [on]
   * @param {readonly Callback<HTMLElementTagNameMap[K]>[]} [also]
   */
  constructor(name, props, attrs, on, also) {
    super(props, attrs, on, also);
    this.#name = name;
  }

  /** @override */
  make() {
    return document.createElement(this.#name);
  }

  /**
   * @param {object} [props]
   * @param {object} [attrs]
   * @param {readonly object[]} [on]
   * @param {readonly Callback<HTMLElementTagNameMap[K]>[]} [also]
   * @override
   */
  next(props, attrs, on, also) {
    return new HTMLBuilder(this.#name, props, attrs, on, also);
  }
}

/**
 * Builds deprecated HTML elements, which the DOM types in their own tag map.
 * @template {keyof HTMLElementDeprecatedTagNameMap} K
 * @extends {Builder<HTMLElementDeprecatedTagNameMap[K], HTMLElementsAttributesMap[K], ElementEventData<HTMLElementDeprecatedTagNameMap[K]>>}
 */
export class DeprecatedHTMLBuilder extends Builder {
  #name;

  /**
   * @param {K} name
   * @param {object} [props]
   * @param {object} [attrs]
   * @param {readonly object[]} [on]
   * @param {readonly Callback<HTMLElementDeprecatedTagNameMap[K]>[]} [also]
   */
  constructor(name, props, attrs, on, also) {
    super(props, attrs, on, also);
    this.#name = name;
  }

  /** @override */
  make() {
    return document.createElement(this.#name);
  }

  /**
   * @param {object} [props]
   * @param {object} [attrs]
   * @param {readonly object[]} [on]
   * @param {readonly Callback<HTMLElementDeprecatedTagNameMap[K]>[]} [also]
   * @override
   */
  next(props, attrs, on, also) {
    return new DeprecatedHTMLBuilder(this.#name, props, attrs, on, also);
  }
}
