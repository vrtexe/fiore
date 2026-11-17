import { LATE_PROPS, assignProperties, attachEventListener, isLive, replaceChildren, runCallback, setAttributes } from './base.js';
import { isPlainObject } from './utils.js';

/** @import { Children, ElementProps, LiveAttributes, TagData } from '../types/base.dom.d.ts' */

/**
 * A callback that gets the created element. It is declared through a method, so a builder of a specific element, such
 * as a div, still fits a modifier written for every HTML element.
 * @template T
 * @typedef {{ call(element: T): void }['call']} Callback
 */

/** @type {readonly never[]} */
const NONE = [];

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
export function tag(builder) {
  /** @param {TagData<T, A, On> | Children} [arg] */
  const call = (arg) => builder.from(arg);
  return Object.assign(call, {
    /** @param {ElementProps<T>} map */
    props: (map) => builder.props(map),
    /** @param {LiveAttributes<A>} map */
    attrs: (map) => builder.attrs(map),
    /** @param {On} map */
    on: (map) => builder.on(map),
    /** @param {(builder: Builder<T, A, On>) => Builder<Element, unknown, object>} fn */
    with: (fn) => builder.with(fn),
    /** @param {Callback<T>} fn */
    also: (fn) => builder.also(fn),
    /** @param {Children} [children] */
    create: (children) => builder.create(children),
  });
}

/**
 * Records settings without touching the DOM. Every method returns a new builder, so one builder can serve as a
 * template; `create()` creates the element. `HTMLBuilder`, `SVGBuilder` and `MathBuilder` create the element of their
 * namespace.
 * @template {Element} T
 * @template A
 * @template {object} On
 */
export class Builder {
  #props;
  #attrs;
  #on;
  #also;
  /** @type {T | null | undefined} The element `create` clones; null when cloning is not the same, undefined until checked. */
  #template = undefined;
  /** Whether `create` ran once; the template is prepared on the second call. */
  #created = false;

  /**
   * @param {object} [props]
   * @param {object} [attrs]
   * @param {readonly object[]} [on]
   * @param {readonly Callback<T>[]} [also]
   */
  constructor(props, attrs, on = NONE, also = NONE) {
    this.#props = props;
    this.#attrs = attrs;
    this.#on = on;
    this.#also = also;
  }

  /**
   * Creates the element of the tag.
   * @returns {T}
   */
  make() {
    throw new TypeError('make() is implemented by HTMLBuilder, SVGBuilder and MathBuilder');
  }

  /**
   * Returns a builder of the same tag with these settings.
   * @param {object} [props]
   * @param {object} [attrs]
   * @param {readonly object[]} [on]
   * @param {readonly Callback<T>[]} [also]
   * @returns {Builder<T, A, On>}
   */
  next(props, attrs, on, also) {
    throw new TypeError('next() is implemented by HTMLBuilder, SVGBuilder and MathBuilder');
  }

  /**
   * DOM properties. Repeated calls combine them; later keys win.
   * @param {ElementProps<T>} map
   */
  props(map) {
    return this.next({ ...this.#props, ...map }, this.#attrs, this.#on, this.#also);
  }

  /**
   * Attributes. Repeated calls combine them; later keys win and `null` removes an earlier value.
   * @param {LiveAttributes<A>} map
   */
  attrs(map) {
    return this.next(this.#props, { ...this.#attrs, ...map }, this.#on, this.#also);
  }

  /**
   * Event listeners, as `{ click: fn }` or `{ click: { handler, options } }`. Repeated calls add listeners.
   * @param {On} map
   */
  on(map) {
    return this.next(this.#props, this.#attrs, [...this.#on, { ...map }], this.#also);
  }

  /**
   * Applies a modifier; the result keeps the type of this tag.
   * @param {(builder: Builder<T, A, On>) => Builder<Element, unknown, object>} fn
   * @returns {Builder<T, A, On>}
   */
  with(fn) {
    const result = fn(this);
    return this.next(result.#props, result.#attrs, result.#on, result.#also);
  }

  /**
   * Calls `fn` with the created element, after the listeners; it is not connected to the document yet.
   * @param {Callback<T>} fn
   */
  also(fn) {
    return this.next(this.#props, this.#attrs, this.#on, [...this.#also, fn]);
  }

  /**
   * Creates the element with these children and returns it.
   * @param {Children} [children]
   */
  create(children) {
    if (this.#template === undefined) {
      // A builder used once, such as one made per row with `on`, would pay for a template it never clones.
      if (!this.#created) {
        this.#created = true;
        return this.#build(this.#props, this.#attrs, children, this.#on, this.#also);
      }
      this.#template = this.#prepare();
    }
    if (this.#template === null) {
      return this.#build(this.#props, this.#attrs, children, this.#on, this.#also);
    }
    const element = /** @type {T} */ (this.#template.cloneNode(false));
    replaceChildren(element, children);
    for (const on of this.#on) {
      attachEventListener(element, on);
    }
    for (const callback of this.#also) {
      runCallback(element, callback);
    }
    return element;
  }

  /**
   * An element with the props and attributes applied, to clone for every create, or null when a clone would not be the
   * same: live, nested or late props, live attributes, custom elements, and props that a clone does not carry over.
   * @returns {T | null}
   */
  #prepare() {
    const props = /** @type {Record<string, unknown> | undefined} */ (this.#props);
    const attrs = /** @type {Record<string, unknown> | undefined} */ (this.#attrs);
    const names = props ? Object.keys(props) : [];
    for (const name of names) {
      const value = /** @type {Record<string, unknown>} */ (props)[name];
      if (isLive(value) || isPlainObject(value) || LATE_PROPS.has(name)) {
        return null;
      }
    }
    if (attrs) {
      for (const name of Object.keys(attrs)) {
        if (isLive(attrs[name])) {
          return null;
        }
      }
    }
    const element = this.make();
    if (element.localName.includes('-')) {
      return null;
    }
    assignProperties(element, props);
    setAttributes(element, attrs);
    // A prop survives the clone when it reflects an attribute, as className does; one that does not, such as
    // textContent or an expando, disables the template.
    const clone = /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (element.cloneNode(false)));
    for (const name of names) {
      if (!Object.is(clone[name], /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (element))[name])) {
        return null;
      }
    }
    return element;
  }

  /**
   * The plain call: a plain object is the data object, unless it is live; anything else is the children.
   * @param {TagData<T, A, On> | Children} [arg]
   */
  from(arg) {
    if (!isPlainObject(arg) || isLive(arg)) {
      return this.#build(undefined, undefined, arg, NONE, NONE);
    }
    // Own keys only, so a polluted Object.prototype never reaches the element.
    const props = Object.hasOwn(arg, 'props') ? arg.props : undefined;
    const attrs = Object.hasOwn(arg, 'attrs') ? arg.attrs : undefined;
    const children = Object.hasOwn(arg, 'children') ? arg.children : undefined;
    const on = Object.hasOwn(arg, 'on') ? arg.on : undefined;
    return this.#build(props ?? undefined, attrs ?? undefined, children, on ? [on] : NONE, NONE);
  }

  /**
   * Creates the element and applies props, attributes, children, late props, listeners and callbacks in that order.
   * @param {object | undefined} props
   * @param {object | undefined} attrs
   * @param {Children | undefined} children
   * @param {readonly object[]} listeners
   * @param {readonly Callback<T>[]} callbacks
   */
  #build(props, attrs, children, listeners, callbacks) {
    const element = this.make();
    assignProperties(element, props);
    setAttributes(element, attrs);
    replaceChildren(element, children);
    assignProperties(element, props, true);
    for (const on of listeners) {
      attachEventListener(element, on);
    }
    for (const callback of callbacks) {
      runCallback(element, callback);
    }
    return element;
  }
}
