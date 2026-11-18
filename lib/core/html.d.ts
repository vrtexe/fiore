/**
 * Returns the tag of any HTML element by name.
 * @template {keyof HTMLElementTagNameMap} K
 * @overload
 * @param {K} name
 * @returns {HTMLTag<K>}
 */
export function element<K extends keyof HTMLElementTagNameMap>(name: K): HTMLTag<K>;
/**
 * Returns the tag of a custom element, whose name has a hyphen; it takes any attribute.
 * @overload
 * @param {`${string}-${string}`} name
 * @returns {CustomElementTag}
 */
export function element(name: `${string}-${string}`): CustomElementTag;
/**
 * @deprecated
 * @template {keyof HTMLElementDeprecatedTagNameMap} K
 * @param {K} name
 * @returns {DeprecatedHTMLTag<K>}
 */
export function deprecatedElement<K extends keyof HTMLElementDeprecatedTagNameMap>(name: K): DeprecatedHTMLTag<K>;
/**
 * Builds HTML elements.
 * @template {keyof HTMLElementTagNameMap} K
 * @extends {Builder<HTMLElementTagNameMap[K], HTMLElementsAttributesMap[K], ElementEventData<HTMLElementTagNameMap[K]>>}
 */
export class HTMLBuilder<K extends keyof HTMLElementTagNameMap> extends Builder<HTMLElementTagNameMap[K], HTMLElementsAttributesMap[K], ElementEventData<HTMLElementTagNameMap[K]>> {
    /**
     * @param {K} name
     * @param {object} [props]
     * @param {object} [attrs]
     * @param {readonly object[]} [on]
     * @param {readonly (Callback<HTMLElementTagNameMap[K]> | Ref<any>)[]} [also]
     */
    constructor(name: K, props?: object, attrs?: object, on?: readonly object[], also?: readonly (Callback<HTMLElementTagNameMap[K]> | Ref<any>)[]);
    /**
     * @param {object} [props]
     * @param {object} [attrs]
     * @param {readonly object[]} [on]
     * @param {readonly (Callback<HTMLElementTagNameMap[K]> | Ref<any>)[]} [also]
     * @override
     */
    override next(props?: object, attrs?: object, on?: readonly object[], also?: readonly (Callback<HTMLElementTagNameMap[K]> | Ref<any>)[]): HTMLBuilder<K>;
    #private;
}
/**
 * Builds deprecated HTML elements, which the DOM types in their own tag map.
 * @template {keyof HTMLElementDeprecatedTagNameMap} K
 * @extends {Builder<HTMLElementDeprecatedTagNameMap[K], HTMLElementsAttributesMap[K], ElementEventData<HTMLElementDeprecatedTagNameMap[K]>>}
 */
export class DeprecatedHTMLBuilder<K extends keyof HTMLElementDeprecatedTagNameMap> extends Builder<HTMLElementDeprecatedTagNameMap[K], HTMLElementsAttributesMap[K], ElementEventData<HTMLElementDeprecatedTagNameMap[K]>> {
    /**
     * @param {K} name
     * @param {object} [props]
     * @param {object} [attrs]
     * @param {readonly object[]} [on]
     * @param {readonly (Callback<HTMLElementDeprecatedTagNameMap[K]> | Ref<any>)[]} [also]
     */
    constructor(name: K, props?: object, attrs?: object, on?: readonly object[], also?: readonly (Callback<HTMLElementDeprecatedTagNameMap[K]> | Ref<any>)[]);
    /**
     * @param {object} [props]
     * @param {object} [attrs]
     * @param {readonly object[]} [on]
     * @param {readonly (Callback<HTMLElementDeprecatedTagNameMap[K]> | Ref<any>)[]} [also]
     * @override
     */
    override next(props?: object, attrs?: object, on?: readonly object[], also?: readonly (Callback<HTMLElementDeprecatedTagNameMap[K]> | Ref<any>)[]): DeprecatedHTMLBuilder<K>;
    #private;
}
import type { HTMLTag } from '../types/html.dom.d.ts';
import type { CustomElementTag } from '../types/html.dom.d.ts';
import type { DeprecatedHTMLTag } from '../types/html.dom.d.ts';
import type { HTMLElementsAttributesMap } from '../types/attributes.d.ts';
import type { ElementEventData } from '../types/html.dom.d.ts';
import { Builder } from './builder.js';
import type { Callback } from './builder.js';
import type { Ref } from './builder.js';
