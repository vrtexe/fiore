/**
 * Assigns the props except `value`, `selectedIndex` and `checked`, or only those when `late` is true.
 * @template {BaseElement} T
 * @param {T} element
 * @param {ElementProps<T> | null | undefined} props
 * @param {boolean} [late]
 */
export function assignProperties<T extends BaseElement>(element: T, props: ElementProps<T> | null | undefined, late?: boolean): void;
/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
export function isPlainObject(value: unknown): value is Record<string, unknown>;
/**
 * @template {BaseElement} T
 * @template {keyof HTMLElementTagNameMap|keyof SVGElementTagNameMap} A
 * @param {T} element
 * @param {HTMLElementsAttributesMap[A] | null | undefined} attributes
 */
export function setAttributes<T extends BaseElement, A extends keyof HTMLElementTagNameMap | keyof SVGElementTagNameMap>(element: T, attributes: HTMLElementsAttributesMap[A] | null | undefined): void;
/**
 * @param {BaseElement} element
 * @param {Children|undefined|null} children
 */
export function replaceChildren(element: BaseElement, children: Children | undefined | null): void;
/**
 * Adds the listeners of an `on` map: a function, or an object with `handler` and `options`.
 * @param {Element} element
 * @param {Record<string, EventListener | { handler?: EventListener | null, options?: boolean | AddEventListenerOptions | null } | null | undefined> | null | undefined} eventData
 */
export function attachEventListener(element: Element, eventData: Record<string, EventListener | {
    handler?: EventListener | null;
    options?: boolean | AddEventListenerOptions | null;
} | null | undefined> | null | undefined): void;
import type { BaseElement } from '../types/base.dom.d.ts';
import type { ElementProps } from '../types/base.dom.d.ts';
import type { HTMLElementsAttributesMap } from '../types/attributes.d.ts';
import type { Children } from '../types/base.dom.d.ts';
