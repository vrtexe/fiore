import { element } from 'fiorejs';
import svg, { element as svgElement } from 'fiorejs/svg';

// ponytail: a, script, style and title always create HTML elements; SVG versions need a namespace hint
const SVG_TAGS = new Set(
  Object.keys(svg)
    .filter((name) => !['element', 'a', 'script', 'style', 'title'].includes(name))
    .map((name) => (name === 'switch_' ? 'switch' : name)),
);

/** @type {Map<string, object>} */
const prototypes = new Map();

/**
 * @param {string} tag
 * @param {string} name
 */
function isWritableProperty(tag, name) {
  if (!prototypes.has(tag)) {
    prototypes.set(tag, Object.getPrototypeOf(document.createElement(tag)));
  }

  for (let proto = prototypes.get(tag); proto; proto = Object.getPrototypeOf(proto)) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, name);
    if (descriptor) {
      return Boolean(descriptor.set || descriptor.writable);
    }
  }

  return false;
}

/**
 * @param {unknown} children
 * @returns {any[]}
 */
function flatten(children) {
  return [children].flat(Infinity).filter((child) => child != null && typeof child !== 'boolean');
}

/**
 * @param {string | ((props: any) => Node)} type
 * @param {Record<string, unknown>} props
 * @returns {Node}
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
    if (name.startsWith('on:')) {
      data.event[name.slice(3)] = value;
    } else if (/^on[A-Z]/.test(name)) {
      data.event[name.slice(2).toLowerCase()] = value;
    } else if (name === 'style' && typeof value === 'object') {
      data.props.style = value;
    } else if (!isSvg && isWritableProperty(type, name)) {
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
  fragment.append(...flatten(children));
  return fragment;
}

export { jsx as jsxs };
