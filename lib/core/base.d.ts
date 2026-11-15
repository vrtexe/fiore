/**
 * Assigns the props except `value`, `selectedIndex` and `checked`, or only those when `late` is true.
 * @param {Element} element
 * @param {object | null | undefined} props
 * @param {boolean} [late]
 */
export function assignProperties(element: Element, props: object | null | undefined, late?: boolean): void;
/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
export function isPlainObject(value: unknown): value is Record<string, unknown>;
/**
 * @param {Element} element
 * @param {object | null | undefined} attributes
 */
export function setAttributes(element: Element, attributes: object | null | undefined): void;
/**
 * @param {BaseElement} element
 * @param {Children|undefined|null} children
 */
export function replaceChildren(element: BaseElement, children: Children | undefined | null): void;
/**
 * Adds the listeners of an `on` map: a function, or an object with `handler` and `options`.
 * @param {Element} element
 * @param {object | null | undefined} eventData
 */
export function attachEventListener(element: Element, eventData: object | null | undefined): void;
import type { BaseElement } from '../types/base.dom.d.ts';
import type { Children } from '../types/base.dom.d.ts';
