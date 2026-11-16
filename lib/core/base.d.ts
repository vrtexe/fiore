/**
 * Assigns the props except `value`, `selectedIndex` and `checked`, or only those when `late` is true.
 * @param {Element} element
 * @param {object | null | undefined} props
 * @param {boolean} [late]
 */
export function assignProperties(element: Element, props: object | null | undefined, late?: boolean): void;
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
 * Whether the value is live: an object or a function with a [LIVE] method.
 * @param {unknown} value
 * @returns {value is LiveValue<unknown>}
 */
export function isLive(value: unknown): value is LiveValue<unknown>;
/**
 * Adds the listeners of an `on` map: a function, or an object with `handler` and `options`.
 * @param {Element} element
 * @param {object} eventData
 */
export function attachEventListener(element: Element, eventData: object): void;
/** @import { BaseElement, Children, LiveValue } from '../types/base.dom.d.ts' */
/** The key of the method that makes a value live; global, so live values work across copies of fiorejs. */
export const LIVE: unique symbol;
import type { BaseElement } from '../types/base.dom.d.ts';
import type { Children } from '../types/base.dom.d.ts';
import type { LiveValue } from '../types/base.dom.d.ts';
