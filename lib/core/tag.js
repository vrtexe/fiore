import {
  assignProperties,
  attachEventListener,
  isPlainObject,
  replaceChildren,
  setAttributes,
} from './base.js';

/** @import { Children } from '../types/base.dom.d.ts' */

/**
 * @typedef {{ props?: object | null, attrs?: object | null, on?: object | null, children?: Children }} Data
 * @typedef {(element: any) => void} Callback
 */

/** @type {readonly never[]} */
const NONE = [];

/**
 * Creates the element and applies props, attributes, children, late props, listeners and callbacks in that order.
 * @param {() => Element} make
 * @param {Data} data
 * @param {readonly (object | null | undefined)[]} listeners
 * @param {readonly Callback[]} callbacks
 */
function build(make, data, listeners, callbacks) {
  const element = make();
  const props = data.props;
  assignProperties(element, props);
  setAttributes(element, data.attrs);
  replaceChildren(element, data.children);
  assignProperties(element, props, true);
  for (const on of listeners) {
    // @ts-expect-error the listener maps of every namespace share one shape
    attachEventListener(element, on);
  }
  for (const callback of callbacks) {
    callback(element);
  }
  return element;
}

/** Records settings without touching the DOM; every method returns a new builder and `create()` creates the element. */
class Builder {
  #make;
  #props;
  #attrs;
  #on;
  #also;

  /**
   * @param {() => Element} make
   * @param {Record<string, unknown>} [props]
   * @param {Record<string, unknown>} [attrs]
   * @param {readonly object[]} [on]
   * @param {readonly Callback[]} [also]
   */
  constructor(make, props, attrs, on = NONE, also = NONE) {
    this.#make = make;
    this.#props = props;
    this.#attrs = attrs;
    this.#on = on;
    this.#also = also;
  }

  /** @param {object} map */
  props(map) {
    return new Builder(this.#make, { ...this.#props, ...map }, this.#attrs, this.#on, this.#also);
  }

  /** @param {object} map */
  attrs(map) {
    return new Builder(this.#make, this.#props, { ...this.#attrs, ...map }, this.#on, this.#also);
  }

  /** @param {object} map */
  on(map) {
    return new Builder(this.#make, this.#props, this.#attrs, [...this.#on, { ...map }], this.#also);
  }

  /** @param {(builder: Builder) => Builder} fn */
  with(fn) {
    return fn(this);
  }

  /** @param {Callback} fn */
  also(fn) {
    return new Builder(this.#make, this.#props, this.#attrs, this.#on, [...this.#also, fn]);
  }

  /** @param {Children} [children] */
  create(children) {
    const data = { props: this.#props, attrs: this.#attrs, children };
    return build(this.#make, data, this.#on, this.#also);
  }
}

/**
 * A tag function: called with a data object or children it creates the element, and it carries the builder methods.
 * @param {() => Element} make
 */
export function tag(make) {
  /** @param {Data | Children} [arg] */
  const call = (arg) =>
    isPlainObject(arg) ? build(make, arg, arg.on ? [arg.on] : NONE, NONE) : build(make, { children: arg }, NONE, NONE);
  return Object.assign(call, {
    /** @param {object} map */
    props: (map) => new Builder(make).props(map),
    /** @param {object} map */
    attrs: (map) => new Builder(make).attrs(map),
    /** @param {object} map */
    on: (map) => new Builder(make).on(map),
    /** @param {(builder: Builder) => Builder} fn */
    with: (fn) => fn(new Builder(make)),
    /** @param {Callback} fn */
    also: (fn) => new Builder(make).also(fn),
    /** @param {Children} [children] */
    create: (children) => new Builder(make).create(children),
  });
}

/**
 * Returns one tag per name, so creating elements by name does not build a tag function each time.
 * @param {(name: string) => Element} make
 */
export function tagsByName(make) {
  /** @type {Map<string, ReturnType<typeof tag>>} */
  const tags = new Map();
  /** @param {string} name */
  return (name) => {
    let found = tags.get(name);
    if (!found) {
      found = tag(() => make(name));
      tags.set(name, found);
    }
    return found;
  };
}
