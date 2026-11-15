import { tag, tagsByName } from './tag.js';

/** @import { HTMLTag, DeprecatedHTMLTag } from '../types/html.dom.d.ts' */

/**
 * @template {keyof HTMLElementTagNameMap} T
 * @param {T} name
 * @returns {HTMLTag<T>}
 */
export function htmlTag(name) {
  // @ts-expect-error the tag function implements HTMLTag
  return tag(() => document.createElement(name));
}

/**
 * @deprecated
 * @template {keyof HTMLElementDeprecatedTagNameMap} T
 * @param {T} name
 * @returns {DeprecatedHTMLTag<T>}
 */
export function deprecatedHtmlTag(name) {
  // @ts-expect-error the tag function implements DeprecatedHTMLTag
  return tag(() => document.createElement(name));
}

const byName = tagsByName((name) => document.createElement(name));

/**
 * Returns the tag of any HTML element by name, the same tag function on every call.
 * @template {keyof HTMLElementTagNameMap} T
 * @param {T} name
 * @returns {HTMLTag<T>}
 */
export function element(name) {
  // @ts-expect-error the tag function implements HTMLTag
  return byName(name);
}

/**
 * @deprecated
 * @template {keyof HTMLElementDeprecatedTagNameMap} T
 * @param {T} name
 * @returns {DeprecatedHTMLTag<T>}
 */
export function deprecatedElement(name) {
  // @ts-expect-error the tag function implements DeprecatedHTMLTag
  return byName(name);
}
