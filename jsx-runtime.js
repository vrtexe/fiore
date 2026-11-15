import { element } from 'fiorejs';
import svg, { element as svgElement } from 'fiorejs/svg';

// ponytail: a, script, style and title always create HTML elements; SVG versions need a namespace hint
const SVG_TAGS = new Set(
  Object.keys(svg)
    .filter((name) => !['element', 'a', 'script', 'style', 'title'].includes(name))
    .map((name) => (name === 'switch_' ? 'switch' : name)),
);

/** Names of event handlers, in any case. */
const HANDLER = /^on/i;

/** @type {Map<string, Element>} One probe element per built-in tag, to look up its properties. */
const probes = new Map();

/** What a built-in element's property is: not writable, writable, a number or a string. */
const NONE = 0;
const OTHER = 1;
const NUMBER = 2;
const STRING = 3;

/** @type {Map<string, number>} The kind of each built-in property, by tag and name. */
const kinds = new Map();

/**
 * @param {string} tag
 * @param {string} name
 */
function kindOf(tag, name) {
  const key = `${tag} ${name}`;
  let kind = kinds.get(key);
  if (kind === undefined) {
    let probe = probes.get(tag);
    if (!probe) {
      probe = document.createElement(tag);
      probes.set(tag, probe);
    }
    const current = /** @type {any} */ (probe)[name];
    kind = !hasSetter(Object.getPrototypeOf(probe), name)
      ? NONE
      : typeof current === 'number'
        ? NUMBER
        : typeof current === 'string'
          ? STRING
          : OTHER;
    kinds.set(key, kind);
  }
  return kind;
}

/**
 * Decides whether a prop is set as a property rather than an attribute.
 * Built-in elements use their writable properties, except that a string for a numeric property, and a live getter
 * for a lower-case string or numeric property other than value, go to the attribute, so null removes it and
 * width="50%" keeps its meaning. A custom element may be defined after its first use and keep class fields off its
 * prototype, so object and function values go to its properties too; it is never constructed to find out.
 * @param {string} tag
 * @param {string} name
 * @param {unknown} value
 * @param {CustomElementConstructor | undefined} definition
 */
function isProperty(tag, name, value, definition) {
  if (tag.includes('-')) {
    if (definition && hasSetter(definition.prototype, name)) {
      return true;
    }
    return typeof value === 'object' || typeof value === 'function';
  }

  const kind = kindOf(tag, name);
  if (kind === NONE) {
    return false;
  }
  if (typeof value === 'function') {
    const plain = (kind === NUMBER || kind === STRING) && name === name.toLowerCase() && name !== 'value';
    return !plain;
  }
  return !(typeof value === 'string' && kind === NUMBER);
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

/**
 * @param {string | ((props: any) => Node | Promise<Node>)} type
 * @param {Record<string, unknown>} props
 * @returns {Node | Promise<Node>}
 */
export function jsx(type, props) {
  if (typeof type === 'function') {
    return type(props);
  }

  const { children, ...rest } = props;
  const isSvg = SVG_TAGS.has(type);
  const definition =
    type.includes('-') && typeof customElements !== 'undefined' ? customElements.get(type) : undefined;
  /** @type {Record<string, any>} */
  const data = { props: {}, attributes: {}, event: {}, children: flatten(children) };

  for (const [name, value] of Object.entries(rest)) {
    // A key inside a spread object is ignored like a key written on the element.
    if (name === 'key') {
      continue;
    }
    if (HANDLER.test(name)) {
      if (value != null) {
        data.event[name.slice(2)] = value;
      }
    } else if (value === null) {
      // null removes the attribute instead of writing "null" into a property.
      data.attributes[name] = null;
    } else if (name === 'style' && typeof value === 'object') {
      data.props.style = value;
    } else if (!isSvg && isProperty(type, name, value, definition)) {
      data.props[name] = value;
    } else {
      data.attributes[name] = value;
    }
  }

  // @ts-expect-error tag is checked by the JSX types
  return isSvg ? svgElement(type, data) : element(type, data);
}

/**
 * @param {{ children?: unknown }} props
 * @returns {DocumentFragment}
 */
export function Fragment({ children }) {
  // A range moves the nodes in one step; spreading them as arguments overflows for very long lists.
  const range = document.createRange();
  range.selectNodeContents(element('div', { children: flatten(children) }));
  return range.extractContents();
}

export { jsx as jsxs };
