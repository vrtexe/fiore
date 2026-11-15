/**
 * A tag function: called with a data object or children it creates the element, and it carries the builder methods.
 * @param {() => Element} create
 */
export function tag(create: () => Element): ((arg?: Data | Children) => Element) & {
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
    /** @param {...Children} children */
    of: (...children: Children[]) => Element;
};
/**
 * Returns one tag per name, so creating elements by name does not build a tag function each time.
 * @param {(name: string) => Element} create
 */
export function tagsByName(create: (name: string) => Element): (name: string) => ((arg?: Data | Children) => Element) & {
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
    /** @param {...Children} children */
    of: (...children: Children[]) => Element;
};
export type Data = {
    props?: object | null;
    attrs?: object | null;
    on?: object | null;
    children?: Children;
};
export type Callback = (element: any) => void;
import type { Children } from '../types/base.dom.d.ts';
/** Records settings without touching the DOM; every method returns a new builder and `of()` creates the element. */
declare class Builder {
    /**
     * @param {() => Element} create
     * @param {Record<string, unknown>} [props]
     * @param {Record<string, unknown>} [attrs]
     * @param {readonly object[]} [on]
     * @param {readonly Callback[]} [also]
     */
    constructor(create: () => Element, props?: Record<string, unknown>, attrs?: Record<string, unknown>, on?: readonly object[], also?: readonly Callback[]);
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
    /** @param {...Children} children */
    of(...children: Children[]): Element;
    #private;
}
export {};
