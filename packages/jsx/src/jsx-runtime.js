import { element } from 'fiorejs';
import svg, { element as svgElement } from 'fiorejs/svg';

// ponytail: a, script, style and title always create HTML elements; SVG versions need a namespace hint
const SVG_TAGS = new Set(
  Object.keys(svg)
    .filter((name) => !['element', 'a', 'script', 'style', 'title'].includes(name))
    .map((name) => (name === 'switch_' ? 'switch' : name)),
);

/** Tag functions by name, so every element name builds its tag function once. */
const htmlTags = new Map();
const svgTags = new Map();

/** Names of event handlers, in any case. */
const HANDLER = /^on/i;

/**
 * Lower-case properties that hold state no attribute of the same name reflects, such as the current value or
 * whether a box is checked now; they stay properties.
 */
const STATE = new Set(['value', 'checked', 'selected', 'muted', 'indeterminate', 'volume', 'text', 'files']);

/** @type {Map<string, object>} The prototype of each built-in tag. */
const prototypes = new Map();

/** @type {WeakMap<object, Map<string, boolean>>} Whether a prototype has a setter, by name. */
const setters = new WeakMap();

/**
 * @param {object} proto
 * @param {string} name
 */
function settable(proto, name) {
  let names = setters.get(proto);
  if (!names) {
    names = new Map();
    setters.set(proto, names);
  }
  let result = names.get(name);
  if (result === undefined) {
    result = hasSetter(proto, name);
    names.set(name, result);
  }
  return result;
}

/**
 * Decides whether a prop is set as a property rather than an attribute, from its name alone, so a plain value and a
 * live value always end up in the same place.
 * Built-in elements: camel-case names such as textContent or className and the lower-case state properties such as
 * value and checked are properties where the element has them; every other name is an attribute, so null removes it
 * and width="50%" keeps its meaning. A custom element may be defined after its first use and keep class fields off
 * its prototype, so object and function values go to its properties too; it is never constructed to find out.
 * @param {string} tag
 * @param {string} name
 * @param {unknown} value
 * @param {CustomElementConstructor | undefined} definition
 */
function isProperty(tag, name, value, definition) {
  if (tag.includes('-')) {
    return (
      settable((definition ?? HTMLElement).prototype, name) || typeof value === 'object' || typeof value === 'function'
    );
  }
  if (name === name.toLowerCase() && !STATE.has(name)) {
    return false;
  }
  let proto = prototypes.get(tag);
  if (!proto) {
    proto = Object.getPrototypeOf(document.createElement(tag));
    prototypes.set(tag, proto);
  }
  return settable(proto, name);
}

/**
 * Whether a prototype chain has a setter or a writable data property for `name`; methods do not count.
 * @param {object | null} proto
 * @param {string} name
 */
function hasSetter(proto, name) {
  for (let current = proto; current; current = Object.getPrototypeOf(current)) {
    const descriptor = Object.getOwnPropertyDescriptor(current, name);
    if (descriptor) {
      return Boolean(descriptor.set || (descriptor.writable && typeof descriptor.value !== 'function'));
    }
  }
  return false;
}

/**
 * Flattens nested children with a stack instead of recursion and drops null, undefined and booleans.
 * @param {unknown} children
 * @returns {any[]}
 */
function flatten(children) {
  /** @type {unknown[]} */
  const items = [];
  const stack = [children];
  while (stack.length > 0) {
    const item = stack.pop();
    if (Array.isArray(item)) {
      for (let i = item.length - 1; i >= 0; i--) {
        stack.push(item[i]);
      }
    } else if (item != null && typeof item !== 'boolean') {
      items.push(item);
    }
  }
  return items;
}

/** @param {unknown} error */
function report(error) {
  if (typeof globalThis.reportError === 'function') {
    globalThis.reportError(error);
  } else {
    console.error(error);
  }
}

/**
 * @param {string | ((props: any) => Node | Promise<Node>)} type
 * @param {Record<string, unknown>} props
 * @returns {Node}
 */
export function jsx(type, props) {
  if (typeof type === 'function') {
    const result = type(props);
    if (!(result instanceof Promise)) {
      return result;
    }
    // An async component holds its place with an empty comment until it resolves.
    const marker = document.createComment('');
    result.then((node) => marker.replaceWith(node), report);
    return marker;
  }

  const { children, ...rest } = props;
  const isSvg = SVG_TAGS.has(type);
  const definition =
    type.includes('-') && typeof customElements !== 'undefined' ? customElements.get(type) : undefined;
  /** @type {Record<string, any>} */
  const data = { props: {}, attrs: {}, on: {}, children: flatten(children) };

  for (const [name, value] of Object.entries(rest)) {
    // A key inside a spread object is ignored like a key written on the element.
    if (name === 'key') {
      continue;
    }
    if (HANDLER.test(name)) {
      if (value != null) {
        data.on[name.slice(2).toLowerCase()] = value;
      }
    } else if (value === null) {
      // null removes the attribute instead of writing "null" into a property.
      data.attrs[name] = null;
    } else if (name === 'style' && typeof value === 'object') {
      data.props.style = value;
    } else if (!isSvg && isProperty(type, name, value, definition)) {
      data.props[name] = value;
    } else {
      data.attrs[name] = value;
    }
  }

  const tags = isSvg ? svgTags : htmlTags;
  let create = tags.get(type);
  if (!create) {
    // @ts-expect-error tag is checked by the JSX types
    create = isSvg ? svgElement(type) : element(type);
    tags.set(type, create);
  }
  return create(data);
}

/**
 * @param {{ children?: unknown }} props
 * @returns {DocumentFragment}
 */
export function Fragment({ children }) {
  const items = flatten(children);
  // A second item keeps a lone live child between markers instead of filling the div, so it still updates after the
  // range moves its nodes out.
  items.push(null);
  // A range moves the nodes in one step; spreading them as arguments overflows for very long lists.
  const range = document.createRange();
  range.selectNodeContents(element('div')(items));
  return range.extractContents();
}

export { jsx as jsxs };
