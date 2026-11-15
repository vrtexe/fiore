import { tag } from './tag.js';

/** @import { HTMLTag, DeprecatedHTMLTag } from '../types/html.dom.d.ts' */

/**
 * Returns the tag of any HTML element by name.
 * @template {keyof HTMLElementTagNameMap} T
 * @param {T} name
 * @returns {HTMLTag<T>}
 */
export function element(name) {
  return tag(null, name);
}

/**
 * @deprecated
 * @template {keyof HTMLElementDeprecatedTagNameMap} T
 * @param {T} name
 * @returns {DeprecatedHTMLTag<T>}
 */
export function deprecatedElement(name) {
  return tag(null, name);
}
