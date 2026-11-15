/**
 * A tag function: called with a data object or children it creates the element, and it carries the builder methods.
 * @param {() => Element} make
 */
export function tag(make: () => Element): ((arg?: Data | Children) => Element) & {
    /** @param {object} map */
    props: (map: object) => Builder;
    /** @param {object} map */
    attrs: (map: object) => Builder;
    /** @param {object} map */
    on: (map: object) => Builder;
    /** @param {(builder: Builder) => Builder} fn */
    with: (fn: (builder: Builder) => Builder) => Builder;
    /** @param {Callback} fn */
    also: (fn: Callback) => Builder;
    /** @param {Children} [children] */
    create: (children?: Children) => Element;
};
/**
 * Returns one tag per name, so creating elements by name does not build a tag function each time.
 * @param {(name: string) => Element} make
 */
export function tagsByName(make: (name: string) => Element): (name: string) => ((arg?: Data | Children) => Element) & {
    /** @param {object} map */
    props: (map: object) => Builder;
    /** @param {object} map */
    attrs: (map: object) => Builder;
    /** @param {object} map */
    on: (map: object) => Builder;
    /** @param {(builder: Builder) => Builder} fn */
    with: (fn: (builder: Builder) => Builder) => Builder;
    /** @param {Callback} fn */
    also: (fn: Callback) => Builder;
    /** @param {Children} [children] */
    create: (children?: Children) => Element;
};
export type Data = {
    props?: object | null;
    attrs?: object | null;
    on?: object | null;
    children?: Children;
};
export type Callback = (element: any) => void;
import type { Children } from '../types/base.dom.d.ts';
/** Records settings without touching the DOM; every method returns a new builder and `create()` creates the element. */
declare class Builder {
    /**
     * @param {() => Element} make
     * @param {Record<string, unknown>} [props]
     * @param {Record<string, unknown>} [attrs]
     * @param {readonly object[]} [on]
     * @param {readonly Callback[]} [also]
     */
    constructor(make: () => Element, props?: Record<string, unknown>, attrs?: Record<string, unknown>, on?: readonly object[], also?: readonly Callback[]);
    /** @param {object} map */
    props(map: object): Builder;
    /** @param {object} map */
    attrs(map: object): Builder;
    /** @param {object} map */
    on(map: object): Builder;
    /** @param {(builder: Builder) => Builder} fn */
    with(fn: (builder: Builder) => Builder): Builder;
    /** @param {Callback} fn */
    also(fn: Callback): Builder;
    /** @param {Children} [children] */
    create(children?: Children): Element;
    #private;
}
export {};
