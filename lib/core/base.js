import { bind, plugins } from './plugins.js';

/** @import { BaseElement, ElementProps, Children } from '../types/base.dom.d.ts' */
/** @import { ElementEventData } from '../types/html.dom.d.ts' */
/** @import { SVGElementEventData } from '../types/svg.dom.d.ts' */
/** @import { HTMLElementsAttributesMap } from '../types/attributes.d.ts' */

/** Keys that would reach Object.prototype or a constructor when followed. */
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** Attributes whose "false" value means something, so false is written instead of removing them. */
const ENUMERATED = new Set(['contenteditable', 'draggable', 'spellcheck']);

/**
 * @template {BaseElement} T
 * @param {T} element
 * @param {ElementProps<T> | null | undefined} props
 */
export function assignProperties(element, props) {
  assignNested(element, props, element);
}

/**
 * Assigns own keys only, so polluted prototypes and JSON `__proto__` keys never reach the element.
 * @param {any} target
 * @param {Record<string, unknown> | null | undefined} props
 * @param {BaseElement} element
 */
function assignNested(target, props, element) {
  if (!props) {
    return;
  }

  for (const name of Object.keys(props)) {
    if (UNSAFE_KEYS.has(name)) {
      continue;
    }
    const value = props[name];
    if (
      plugins.length === 0 ||
      !bind(value, (next) => assignProperty(target, name, next, element), { element, kind: 'property', name })
    ) {
      assignProperty(target, name, value, element);
    }
  }
}

/**
 * Merges plain objects into existing objects such as `style` or `dataset`; other values are assigned whole.
 * Undefined leaves the property unchanged.
 * @param {any} target
 * @param {string} name
 * @param {unknown} value
 * @param {BaseElement} element
 */
function assignProperty(target, name, value, element) {
  if (value === undefined) {
    return;
  }
  const current = target[name];
  if (isPlainObject(value) && current && typeof current === 'object' && !isDomRoot(current)) {
    assignNested(current, value, element);
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
 * Nodes and the window are never merged into, so props cannot write to `ownerDocument` or `defaultView`.
 * @param {object} value
 */
function isDomRoot(value) {
  return value instanceof Node || value === globalThis;
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

  for (const name of Object.keys(attributes)) {
    // @ts-expect-error dynamic key access
    const value = attributes[name];
    // Inline handlers (on*) are never offered to plugins, so a function there is not called as a binding.
    if (
      plugins.length === 0 ||
      name.startsWith('on') ||
      !bind(value, (next) => applyAttribute(element, name, next), { element, kind: 'attribute', name })
    ) {
      applyAttribute(element, name, value);
    }
  }
}

/**
 * Removes the attribute for null, undefined and false; aria-*, data-* and enumerated attributes keep "false".
 * @param {BaseElement} element
 * @param {string} name
 * @param {unknown} value
 */
function applyAttribute(element, name, value) {
  const keepsFalse = name.startsWith('aria-') || name.startsWith('data-') || ENUMERATED.has(name);
  if (value == null || (value === false && !keepsFalse)) {
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

  /** @type {(Node | string)[]} */
  const nodes = [];
  for (const child of list) {
    if (child == null || typeof child === 'boolean') {
      continue;
    }
    if (plugins.length === 0 && !(child instanceof Promise)) {
      nodes.push(/** @type {Node | string} */ (child));
    } else {
      nodes.push(...childNodes(element, child));
    }
  }

  // Nothing to insert: keep what props such as textContent or innerHTML put there.
  if (nodes.length > 0) {
    element.replaceChildren(...nodes);
  }
}

/**
 * @param {BaseElement} element
 * @param {unknown} child
 * @returns {(Node | string)[]}
 */
function childNodes(element, child) {
  /** @type {ChildNode[]} */
  let current = [];
  /** @type {Text | null} The text node this slot created itself, which may be updated in place. */
  let ownText = null;

  const apply = (/** @type {unknown} */ value) => {
    if (ownText && current.length === 1 && current[0] === ownText && isText(value)) {
      ownText.data = String(value);
      return;
    }

    const next = toNodes(value);
    const [first] = next;
    ownText =
      next.length === 1 && first?.nodeType === Node.TEXT_NODE && ![value].flat(Infinity).includes(first)
        ? /** @type {Text} */ (first)
        : null;

    const parent = current[0]?.parentNode;
    if (parent) {
      move(parent, current, next);
    }
    current = next;
  };

  if (child instanceof Promise) {
    apply(null);
    child.then(apply).catch((error) => console.error(error));
    return current;
  }

  if (bind(child, apply, { element, kind: 'child' })) {
    if (current.length === 0) {
      apply(null);
    }
    return current;
  }

  return [/** @type {Node | string} */ (child)];
}

/**
 * Replaces the nodes of a slot, removing dropped nodes and moving only kept nodes that are out of order.
 * @param {ParentNode} parent
 * @param {ChildNode[]} current
 * @param {ChildNode[]} next
 */
function move(parent, current, next) {
  const end = current[current.length - 1]?.nextSibling ?? null;
  const kept = new Set(next);
  /** @type {Map<ChildNode, number>} */
  const oldIndex = new Map();
  current.forEach((node, index) => {
    if (kept.has(node)) {
      oldIndex.set(node, index);
    } else {
      node.remove();
    }
  });

  const stay = increasingRun(next.map((node) => oldIndex.get(node) ?? -1));
  let anchor = end;
  for (let i = next.length - 1; i >= 0; i--) {
    const node = /** @type {ChildNode} */ (next[i]);
    if (!stay.has(i)) {
      parent.insertBefore(node, anchor);
    }
    anchor = node;
  }
}

/**
 * Returns the positions of a longest increasing subsequence of the non-negative values: the nodes that can stay.
 * @param {number[]} values
 * @returns {Set<number>}
 */
function increasingRun(values) {
  /** @type {number[]} */
  const tails = [];
  /** @type {number[]} */
  const previous = new Array(values.length).fill(-1);
  values.forEach((value, i) => {
    if (value < 0) {
      return;
    }
    let low = 0;
    let high = tails.length;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (/** @type {number} */ (values[/** @type {number} */ (tails[middle])]) < value) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }
    previous[i] = low > 0 ? /** @type {number} */ (tails[low - 1]) : -1;
    tails[low] = i;
  });

  const run = new Set();
  let i = tails.at(-1) ?? -1;
  while (i >= 0) {
    run.add(i);
    i = previous[i] ?? -1;
  }
  return run;
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
