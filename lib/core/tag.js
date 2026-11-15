import {
  assignProperties,
  attachEventListener,
  isPlainObject,
  replaceChildren,
  setAttributes,
} from './base.js';

/** @import { Children } from '../types/base.dom.d.ts' */

/**
 * @typedef {{ props?: object | null, attrs?: object | null, on?: any, children?: Children }} Data
 * @typedef {(element: any) => void} Callback
 */

/** @type {readonly never[]} */
const NONE = [];

/**
 * Creates the element and applies props, attributes, children, late props, listeners and callbacks in that order.
 * @param {string | null} ns the namespace URI, or null for HTML
 * @param {string} name
 * @param {Data} data
 * @param {readonly any[]} listeners
 * @param {readonly Callback[]} callbacks
 */
function build(ns, name, data, listeners, callbacks) {
  const element = ns ? document.createElementNS(ns, name) : document.createElement(name);
  const props = data.props;
  assignProperties(element, props);
  setAttributes(element, data.attrs);
  replaceChildren(element, data.children);
  assignProperties(element, props, true);
  for (const on of listeners) {
    attachEventListener(element, on);
  }
  for (const callback of callbacks) {
    callback(element);
  }
  return element;
}

/** Records settings without touching the DOM; every method returns a new builder and `create()` creates the element. */
class Builder {
  #ns;
  #name;
  #props;
  #attrs;
  #on;
  #also;

  /**
   * @param {string | null} ns
   * @param {string} name
   * @param {object} [props]
   * @param {object} [attrs]
   * @param {readonly object[]} [on]
   * @param {readonly Callback[]} [also]
   */
  constructor(ns, name, props, attrs, on = NONE, also = NONE) {
    this.#ns = ns;
    this.#name = name;
    this.#props = props;
    this.#attrs = attrs;
    this.#on = on;
    this.#also = also;
  }

  /** @param {object} map */
  props(map) {
    return new Builder(this.#ns, this.#name, { ...this.#props, ...map }, this.#attrs, this.#on, this.#also);
  }

  /** @param {object} map */
  attrs(map) {
    return new Builder(this.#ns, this.#name, this.#props, { ...this.#attrs, ...map }, this.#on, this.#also);
  }

  /** @param {object} map */
  on(map) {
    return new Builder(this.#ns, this.#name, this.#props, this.#attrs, [...this.#on, { ...map }], this.#also);
  }

  /** @param {(builder: Builder) => Builder} fn */
  with(fn) {
    return fn(this);
  }

  /** @param {Callback} fn */
  also(fn) {
    return new Builder(this.#ns, this.#name, this.#props, this.#attrs, this.#on, [...this.#also, fn]);
  }

  /** @param {Children} [children] */
  create(children) {
    const data = { props: this.#props, attrs: this.#attrs, children };
    return build(this.#ns, this.#name, data, this.#on, this.#also);
  }
}

/**
 * A tag function: called with a data object or children it creates the element, and it carries the builder methods.
 * The implementation is loosely typed; `HTMLTag`, `SVGTag` and `MathTag` describe it to users.
 * @param {string | null} ns the namespace URI, or null for HTML
 * @param {string} name
 * @returns {any}
 */
export function tag(ns, name) {
  /** @param {Data | Children} [arg] */
  const call = (arg) =>
    isPlainObject(arg)
      ? build(ns, name, arg, arg.on ? [arg.on] : NONE, NONE)
      : build(ns, name, { children: arg }, NONE, NONE);
  return Object.assign(call, {
    /** @param {object} map */
    props: (map) => new Builder(ns, name).props(map),
    /** @param {object} map */
    attrs: (map) => new Builder(ns, name).attrs(map),
    /** @param {object} map */
    on: (map) => new Builder(ns, name).on(map),
    /** @param {(builder: Builder) => Builder} fn */
    with: (fn) => fn(new Builder(ns, name)),
    /** @param {Callback} fn */
    also: (fn) => new Builder(ns, name).also(fn),
    /** @param {Children} [children] */
    create: (children) => new Builder(ns, name).create(children),
  });
}
