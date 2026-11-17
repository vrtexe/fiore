/**
 * Assigns the props except `value`, `selectedIndex` and `checked`, or only those when `late` is true.
 * @param {Element} element
 * @param {object | null | undefined} props
 * @param {boolean} [late]
 */
export function assignProperties(element: Element, props: object | null | undefined, late?: boolean): void;
/**
 * Applies one value of a live property when it changes. Undefined leaves the property unchanged.
 * @param {any} target
 * @param {string} name
 * @param {unknown} value
 * @param {BaseElement} element
 * @param {string[]} path
 */
export function assignProperty(target: any, name: string, value: unknown, element: BaseElement, path: string[]): void;
/**
 * @param {Element} element
 * @param {object | null | undefined} attributes
 */
export function setAttributes(element: Element, attributes: object | null | undefined): void;
/**
 * Removes the attribute for null, undefined and false; aria-*, data-* and enumerated attributes keep "false".
 * @param {BaseElement} element
 * @param {string} name
 * @param {unknown} value
 */
export function applyAttribute(element: BaseElement, name: string, value: unknown): void;
/**
 * Builds a fragment of children, for a group of nodes without a wrapping element.
 * @param {Children} children
 * @returns {DocumentFragment}
 */
export function fragment(children: Children): DocumentFragment;
/**
 * @param {BaseElement | DocumentFragment} element
 * @param {Children|undefined|null} children
 */
export function replaceChildren(element: BaseElement | DocumentFragment, children: Children | undefined | null): void;
/**
 * Binds a live child between existing markers, or, with null markers, as the only child of `element`.
 * @param {BaseElement | DocumentFragment} element
 * @param {LiveValue<unknown>} child
 * @param {Comment | null} start
 * @param {Comment | null} end
 */
export function bindChild(element: BaseElement | DocumentFragment, child: LiveValue<unknown>, start: Comment | null, end: Comment | null): void;
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
/**
 * Starts or stops recording into `list`; returns the list recorded into before.
 * @param {Recorded[] | null} list
 */
export function recordInto(list: Recorded[] | null): Recorded[] | null;
/**
 * Calls a builder's `also` callback, or, while a blueprint records, keeps it for every copy.
 * @template {Element} E
 * @param {E} element
 * @param {(element: E) => void} fn
 */
export function runCallback<E extends Element>(element: E, fn: (element: E) => void): void;
/** @import { BaseElement, Children, LiveValue } from '../types/base.dom.d.ts' */
/** The key of the method that makes a value live; global, so live values work across copies of fiorejs. */
export const LIVE: unique symbol;
/** Properties that depend on the attributes or children, so they are assigned after both. */
export const LATE_PROPS: Set<string>;
/** Marks a blueprint's placeholder with its slot name. */
export const SLOT: unique symbol;
/**
 * What a blueprint records while its build runs once: where slots land, and the callbacks to run on every copy.
 */
export type Recorded = {
    kind: string;
    name?: string;
    node: Node;
    key?: string;
    path?: string[];
    options?: unknown;
    only?: boolean;
    fn?: (element: Element) => void;
};
import type { BaseElement } from '../types/base.dom.d.ts';
import type { Children } from '../types/base.dom.d.ts';
import type { LiveValue } from '../types/base.dom.d.ts';
