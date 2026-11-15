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

/**
 * Decides whether a prop is set as a property rather than an attribute.
 * Built-in elements use their writable properties. A custom element is looked up on every call, because it can be
 * defined after its first use, and class fields are not on its prototype, so object and function values go to
 * properties too. Custom elements are never constructed to find out.
 * @param {string} tag
 * @param {string} name
 * @param {unknown} value
 */
function isProperty(tag, name, value) {
  if (tag.includes('-')) {
    const definition = typeof customElements === 'undefined' ? undefined : customElements.get(tag);
    if (definition && hasSetter(definition.prototype, name)) {
      return true;
    }
    return typeof value === 'object' || typeof value === 'function';
  }

  let probe = probes.get(tag);
  if (!probe) {
    probe = document.createElement(tag);
    probes.set(tag, probe);
  }
  if (!hasSetter(Object.getPrototypeOf(probe), name)) {
    return false;
  }
  // A string for a numeric property, such as width="50%", keeps its meaning only as an attribute.
  return !(typeof value === 'string' && typeof (/** @type {any} */ (probe)[name]) === 'number');
}

/**
 * @param {object | null} proto
 * @param {string} name
 */
function hasSetter(proto, name) {
  for (let current = proto; current; current = Object.getPrototypeOf(current)) {
    const descriptor = Object.getOwnPropertyDescriptor(current, name);
    if (descriptor) {
      return Boolean(descriptor.set || descriptor.writable);
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
  /** @type {Record<string, any>} */
  const data = { props: {}, attributes: {}, event: {}, children: flatten(children) };

  for (const [name, value] of Object.entries(rest)) {
    if (HANDLER.test(name)) {
      if (value != null) {
        data.event[name.slice(2)] = value;
      }
    } else if (value === null) {
      // null removes the attribute instead of writing "null" into a property.
      data.attributes[name] = null;
    } else if (name === 'style' && typeof value === 'object') {
      data.props.style = value;
    } else if (!isSvg && isProperty(type, name, value)) {
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
  const fragment = document.createDocumentFragment();
  fragment.append(...element('div', { children: flatten(children) }).childNodes);
  return fragment;
}

export { jsx as jsxs };
