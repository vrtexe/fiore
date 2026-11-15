/**
 * A tag function: called with a data object or children it creates the element, and it carries the builder methods.
 * The implementation is loosely typed; `HTMLTag`, `SVGTag` and `MathTag` describe it to users.
 * @param {string | null} ns the namespace URI, or null for HTML
 * @param {string} name
 * @returns {any}
 */
export function tag(ns: string | null, name: string): any;
export type Data = {
    props?: object | null;
    attrs?: object | null;
    on?: any;
    children?: Children;
};
export type Callback = (element: any) => void;
import type { Children } from '../types/base.dom.d.ts';
