import { bind } from './plugins.js';

/** @import { BaseElement, ElementProps, Children } from '../types/base.dom.d.ts' */
/** @import { ElementEventData } from '../types/html.dom.d.ts' */
/** @import { SVGElementEventData } from '../types/svg.dom.d.ts' */
/** @import { HTMLElementsAttributesMap } from '../types/attributes.d.ts' */

/**
 * @template {BaseElement} T
 * @param {T} element
 * @param {ElementProps<T> | null | undefined} props
 */
export function assignProperties(element, props) {
  assignNested(element, props, element);
}

/**
 * @param {any} target
 * @param {Record<string, unknown> | null | undefined} props
 * @param {BaseElement} element
 */
function assignNested(target, props, element) {
  if (!props) {
    return;
  }

  for (const name in props) {
    const apply = (/** @type {unknown} */ value) => assignProperty(target, name, value, element);
    if (!bind(props[name], apply, { element, kind: 'property', name })) {
      apply(props[name]);
    }
  }
}

/**
 * @param {any} target
 * @param {string} name
 * @param {unknown} value
 * @param {BaseElement} element
 */
function assignProperty(target, name, value, element) {
  if (isPlainObject(value) && target[name] && typeof target[name] === 'object') {
    assignNested(target[name], value, element);
  } else {
    target[name] = value;
  }
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isPlainObject(value) {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * @template {BaseElement} T
 * @template {keyof HTMLElementTagNameMap|keyof SVGElementTagNameMap} A
 * @param {T} element
 * @param {HTMLElementsAttributesMap[A] | null | undefined} attributes
 */
export function setAttributes(element, attributes) {
  if (!attributes) {
    return;
  }

  for (const name in attributes) {
    const apply = (/** @type {unknown} */ value) => applyAttribute(element, name, value);
    // @ts-expect-error dynamic key access
    const value = attributes[name];
    if (!bind(value, apply, { element, kind: 'attribute', name })) {
      apply(value);
    }
  }
}

/**
 * Removes the attribute for null, undefined and false; aria-* and data-* keep "false".
 * @param {BaseElement} element
 * @param {string} name
 * @param {unknown} value
 */
function applyAttribute(element, name, value) {
  if (value == null || (value === false && !name.includes('-'))) {
    element.removeAttribute(name);
  } else {
    element.setAttribute(name, String(value));
  }
}

/**
 * @param {BaseElement} element
 * @param {Children|undefined|null} children
 */
export function replaceChildren(element, children) {
  const list = children == null ? [] : Array.isArray(children) ? children : [children];
  element.replaceChildren(...list.flatMap((child) => childNodes(element, child)));
}

/**
 * @param {BaseElement} element
 * @param {unknown} child
 * @returns {(Node | string)[]}
 */
function childNodes(element, child) {
  /** @type {ChildNode[]} */
  let current = [];

  const apply = (/** @type {unknown} */ value) => {
    const [first] = current;
    if (current.length === 1 && first?.nodeType === Node.TEXT_NODE && isText(value)) {
      /** @type {Text} */ (first).data = String(value);
      return;
    }

    const next = toNodes(value);
    first?.before(...next);
    current.forEach((node) => node.remove());
    current = next;
  };

  if (bind(child, apply, { element, kind: 'child' })) {
    return current;
  }

  return child == null || typeof child === 'boolean' ? [] : [/** @type {Node | string} */ (child)];
}

/**
 * @param {unknown} value
 * @returns {value is string | number | bigint}
 */
function isText(value) {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint';
}

/**
 * Turns a bound child value into nodes; an empty value keeps one empty text node as a placeholder.
 * @param {unknown} value
 * @returns {ChildNode[]}
 */
function toNodes(value) {
  /** @type {ChildNode[]} */
  const nodes = [];
  for (const item of [value].flat(Infinity)) {
    if (item == null || typeof item === 'boolean') {
      continue;
    }
    if (typeof item === 'object' && 'nodeType' in item) {
      const node = /** @type {ChildNode} */ (item);
      nodes.push(...(node.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? node.childNodes : [node]));
    } else {
      nodes.push(document.createTextNode(String(item)));
    }
  }

  return nodes.length ? nodes : [document.createTextNode('')];
}

/**
 * @template {HTMLElement|SVGElement} T
 * @template {T extends HTMLElement ? HTMLElementEventMap
 * : T extends SVGElement ? SVGElementEventMap : never} E
 * @typedef {T extends HTMLElement ?
 * ElementEventData<T, E> | undefined | null
 * : T extends SVGElement ?
 *  SVGElementEventData<T, E> | undefined | null
 * : never} GenericEventData
 */

/**
 * @template {SVGElement} T
 * @template {SVGElementEventMap} E
 * @param {T} element
 * @param {SVGElementEventData<T, E> | undefined | null} eventData
 * @returns {void}
 */
export function attachEventListenerSvg(element, eventData) {
  // @ts-expect-error attach event to svg element
  return attachEventListener(element, eventData);
}

/**
 * @template {HTMLElement} T
 * @template {HTMLElementEventMap} E
 * @param {T} element
 * @param {ElementEventData<T, E> | undefined | null} eventData
 * @returns {void}
 */
export function attachEventListener(element, eventData) {
  if (eventData == undefined || eventData == null) {
    return;
  }

  /**
   * @type {(keyof typeof eventData)[]}
   @ts-expect-error assert type */
  const keys = Object.keys(eventData);

  for (const key of keys) {
    const event = eventData[key];
    if (typeof event === 'function') {
      // @ts-expect-error correctly passed handler
      element.addEventListener(key, event);
    } else if (event && typeof event === 'object' && 'handler' in event) {
      if (!event.handler) {
        continue;
      }
      // @ts-expect-error correctly passed handler
      element.addEventListener(key, event.handler, event.options);
    }
  }
}
