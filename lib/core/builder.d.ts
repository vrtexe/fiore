/**
 * A tag function: call it with a data object or children, or start a builder with one of its methods.
 * @template {Element} T
 * @template A
 * @template {object} On
 * @typedef {((data?: TagData<T, A, On> | Children) => T) & {
 *   props(map: ElementProps<T>): Builder<T, A, On>,
 *   attrs(map: LiveAttributes<A>): Builder<T, A, On>,
 *   on(map: On): Builder<T, A, On>,
 *   with(fn: (builder: Builder<T, A, On>) => Builder<Element, unknown, object>): Builder<T, A, On>,
 *   also(fn: Callback<T>): Builder<T, A, On>,
 *   create(children?: Children): T,
 * }} Tag
 */
/**
 * The tag function of a builder: call it with a data object or children, or start a builder with one of its methods.
 * Builders are immutable, so the tag shares one empty builder.
 * @template {Element} T
 * @template A
 * @template {object} On
 * @param {Builder<T, A, On>} builder
 * @returns {Tag<T, A, On>}
 */
export function tag<T extends Element, A, On extends object>(builder: Builder<T, A, On>): Tag<T, A, On>;
/**
 * Records settings without touching the DOM. Every method returns a new builder, so one builder can serve as a
 * template; `create()` creates the element. `HTMLBuilder`, `SVGBuilder` and `MathBuilder` create the element of their
 * namespace.
 * @template {Element} T
 * @template A
 * @template {object} On
 */
export class Builder<T extends Element, A, On extends object> {
    /**
     * @param {object} [props]
     * @param {object} [attrs]
     * @param {readonly object[]} [on]
     * @param {readonly Callback<T>[]} [also]
     */
    constructor(props?: object, attrs?: object, on?: readonly object[], also?: readonly Callback<T>[]);
    /**
     * Creates the element of the tag.
     * @returns {T}
     */
    make(): T;
    /**
     * Returns a builder of the same tag with these settings.
     * @param {object} [props]
     * @param {object} [attrs]
     * @param {readonly object[]} [on]
     * @param {readonly Callback<T>[]} [also]
     * @returns {Builder<T, A, On>}
     */
    next(props?: object, attrs?: object, on?: readonly object[], also?: readonly Callback<T>[]): Builder<T, A, On>;
    /**
     * DOM properties. Repeated calls combine them; later keys win.
     * @param {ElementProps<T>} map
     */
    props(map: ElementProps<T>): Builder<T, A, On>;
    /**
     * Attributes. Repeated calls combine them; later keys win and `null` removes an earlier value.
     * @param {LiveAttributes<A>} map
     */
    attrs(map: LiveAttributes<A>): Builder<T, A, On>;
    /**
     * Event listeners, as `{ click: fn }` or `{ click: { handler, options } }`. Repeated calls add listeners.
     * @param {On} map
     */
    on(map: On): Builder<T, A, On>;
    /**
     * Applies a modifier; the result keeps the type of this tag.
     * @param {(builder: Builder<T, A, On>) => Builder<Element, unknown, object>} fn
     * @returns {Builder<T, A, On>}
     */
    with(fn: (builder: Builder<T, A, On>) => Builder<Element, unknown, object>): Builder<T, A, On>;
    /**
     * Calls `fn` with the created element, after the listeners; it is not connected to the document yet.
     * @param {Callback<T>} fn
     */
    also(fn: Callback<T>): Builder<T, A, On>;
    /**
     * Creates the element with these children and returns it.
     * @param {Children} [children]
     */
    create(children?: Children): T;
    /**
     * The plain call: a plain object is the data object, anything else is the children.
     * @param {TagData<T, A, On> | Children} [arg]
     */
    from(arg?: TagData<T, A, On> | Children): T;
    #private;
}
/**
 * A tag function: call it with a data object or children, or start a builder with one of its methods.
 */
export type Tag<T extends Element, A, On extends object> = ((data?: TagData<T, A, On> | Children) => T) & {
    props(map: ElementProps<T>): Builder<T, A, On>;
    attrs(map: LiveAttributes<A>): Builder<T, A, On>;
    on(map: On): Builder<T, A, On>;
    with(fn: (builder: Builder<T, A, On>) => Builder<Element, unknown, object>): Builder<T, A, On>;
    also(fn: Callback<T>): Builder<T, A, On>;
    create(children?: Children): T;
};
/**
 * A callback that gets the created element. It is declared through a method, so a builder of a specific element, such
 * as a div, still fits a modifier written for every HTML element.
 */
export type Callback<T> = {
    call(element: T): void;
}["call"];
import type { ElementProps } from '../types/base.dom.d.ts';
import type { LiveAttributes } from '../types/base.dom.d.ts';
import type { Children } from '../types/base.dom.d.ts';
import type { TagData } from '../types/base.dom.d.ts';
