/**
 * Returns the tag of any HTML element by name, the same tag function on every call.
 * @template {keyof HTMLElementTagNameMap} T
 * @param {T} name
 * @returns {HTMLTag<T>}
 */
export function element<T extends keyof HTMLElementTagNameMap>(name: T): HTMLTag<T>;
/**
 * @deprecated
 * @template {keyof HTMLElementDeprecatedTagNameMap} T
 * @param {T} name
 * @returns {DeprecatedHTMLTag<T>}
 */
export function deprecatedElement<T extends keyof HTMLElementDeprecatedTagNameMap>(name: T): DeprecatedHTMLTag<T>;
import type { HTMLTag } from '../types/html.dom.d.ts';
import type { DeprecatedHTMLTag } from '../types/html.dom.d.ts';
