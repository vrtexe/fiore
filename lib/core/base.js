import { bind, plugins } from './plugins.js';

/** @import { BaseElement, ElementProps, Children } from '../types/base.dom.d.ts' */
/** @import { ElementEventData } from '../types/html.dom.d.ts' */
/** @import { SVGElementEventData } from '../types/svg.dom.d.ts' */
/** @import { HTMLElementsAttributesMap } from '../types/attributes.d.ts' */

/** Keys that would reach Object.prototype or a constructor when followed. */
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** Attributes whose "false" value means something, so false is written instead of removing them. */
const ENUMERATED = new Set(['contenteditable', 'draggable', 'spellcheck']);

/** Properties that depend on the attributes or children, so they are assigned after both. */
const LATE_PROPS = new Set(['value', 'selectedIndex', 'checked']);

/** Up to this many children are passed as arguments, which is faster than a fragment; longer lists use one. */
const SPREAD_LIMIT = 10000;

/** Names of inline event handlers, which are never set as attributes or offered to plugins. */
const HANDLER = /^on/i;

/**
 * Reads an input from the data object's own keys only, so a polluted Object.prototype cannot supply it.
 * @template {object} D
 * @template {keyof D} K
 * @param {D | undefined} data
 * @param {K} key
 * @returns {D[K] | undefined}
 */
export function own(data, key) {
  return data && Object.hasOwn(data, key) ? data[key] : undefined;
}

/**
 * Assigns the props except `value`, `selectedIndex` and `checked`, or only those when `late` is true.
 * @template {BaseElement} T
 * @param {T} element
 * @param {ElementProps<T> | null | undefined} props
 * @param {boolean} [late]
 */
export function assignProperties(element, props, late = false) {
  assignNested(element, props, element, [], (name) => LATE_PROPS.has(name) === late);
}

/**
 * Assigns own keys only, so polluted prototypes and JSON `__proto__` keys never reach the element.
 * @param {any} target
 * @param {Record<string, unknown> | null | undefined} props
 * @param {BaseElement} element
 * @param {string[]} path
 * @param {(name: string) => boolean} [include]
 */
function assignNested(target, props, element, path, include) {
  if (!props) {
    return;
  }

  for (const name of Object.keys(props)) {
    if (UNSAFE_KEYS.has(name) || (include && !include(name))) {
      continue;
    }
    const value = props[name];
    // Inline handlers exist only as top-level element properties, so nested keys such as dataset.onboarding pass.
    if (plugins.length > 0 && !(path.length === 0 && HANDLER.test(name))) {
      const keyPath = [...path, name];
      const apply = (/** @type {unknown} */ next) => assignProperty(target, name, next, element, path);
      if (bind(value, apply, { element, kind: 'property', name, path: keyPath })) {
        continue;
      }
    }
    assignProperty(target, name, value, element, path);
  }
}

/**
 * Merges plain objects into existing objects such as `style` or `dataset`; other values are assigned whole.
 * Undefined leaves the property unchanged.
 * @param {any} target
 * @param {string} name
 * @param {unknown} value
 * @param {BaseElement} element
 * @param {string[]} path
 */
function assignProperty(target, name, value, element, path) {
  if (value === undefined) {
    return;
  }
  // The current value is only read for plain objects, so getters such as innerHTML are not run on every update.
  if (isPlainObject(value)) {
    const current = target[name];
    if (current && typeof current === 'object' && !isDomRoot(current)) {
      assignNested(current, value, element, [...path, name]);
      return;
    }
  }
  target[name] = value;
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
 * Nodes and windows are never merged into, so props cannot write to `ownerDocument` or `defaultView`.
 * Objects from another window (an iframe) are not instances of this window's Object, so they count too.
 * @param {object} value
 */
function isDomRoot(value) {
  return value instanceof Node || value === globalThis || !(value instanceof Object);
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
    // Inline handlers run strings as script; listeners belong in `event`.
    if (HANDLER.test(name)) {
      continue;
    }
    // @ts-expect-error dynamic key access
    const value = attributes[name];
    if (
      plugins.length === 0 ||
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
    // Passed unchanged, so Trusted Types objects reach setAttribute; the DOM converts other values to strings.
    element.setAttribute(name, /** @type {string} */ (value));
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
      for (const node of childNodes(element, child)) {
        nodes.push(node);
      }
    }
  }

  // Nothing to insert: keep what props such as textContent or innerHTML put there.
  if (nodes.length > SPREAD_LIMIT) {
    // Spreading this many nodes as arguments would overflow; one fragment takes them instead.
    const fragment = document.createDocumentFragment();
    for (const node of nodes) {
      fragment.append(node);
    }
    element.replaceChildren(fragment);
  } else if (nodes.length > 0) {
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
      next.length === 1 && first?.nodeType === Node.TEXT_NODE && !flatten(value).includes(first)
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

  if (bind(child, apply, { element, kind: 'child', nodes: () => current })) {
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
      place(parent, node, anchor);
    }
    anchor = node;
  }
}

/**
 * Moves a node with `moveBefore` where the browser has it, which keeps focus and state, else with `insertBefore`.
 * @param {ParentNode} parent
 * @param {ChildNode} node
 * @param {ChildNode | null} anchor
 */
function place(parent, node, anchor) {
  const target = /** @type {ParentNode & { moveBefore?: (node: Node, child: Node | null) => void }} */ (parent);
  if (target.moveBefore && node.isConnected && parent.isConnected) {
    try {
      target.moveBefore(node, anchor);
      return;
    } catch {
      // moveBefore refuses some moves (for example across documents); insertBefore still works.
    }
  }
  parent.insertBefore(node, anchor);
}

/**
 * Returns the positions of a longest increasing subsequence of the non-negative values: the nodes that can stay.
 * The scan runs from the end, so among equally long runs the one nearest the end stays; a reversed list then moves
 * the nodes that are cheapest to move.
 * @param {number[]} values
 * @returns {Set<number>}
 */
function increasingRun(values) {
  /** @type {number[]} */
  const tails = [];
  /** @type {number[]} */
  const following = new Array(values.length).fill(-1);
  for (let i = values.length - 1; i >= 0; i--) {
    const value = /** @type {number} */ (values[i]);
    if (value < 0) {
      continue;
    }
    let low = 0;
    let high = tails.length;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (/** @type {number} */ (values[/** @type {number} */ (tails[middle])]) > value) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }
    following[i] = low > 0 ? /** @type {number} */ (tails[low - 1]) : -1;
    tails[low] = i;
  }

  const run = new Set();
  let i = tails.at(-1) ?? -1;
  while (i >= 0) {
    run.add(i);
    i = following[i] ?? -1;
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
  /** @type {Set<ChildNode>} A node can only be in one place, so a repeated node is kept once. */
  const nodes = new Set();
  for (const item of flatten(value)) {
    if (item == null || typeof item === 'boolean') {
      continue;
    }
    // A plain object with a nodeType key is not a node; it is shown as text like any other value.
    if (typeof item === 'object' && 'nodeType' in item && !isPlainObject(item)) {
      const node = /** @type {ChildNode} */ (item);
      for (const child of node.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? [...node.childNodes] : [node]) {
        nodes.add(child);
      }
    } else {
      nodes.add(document.createTextNode(String(item)));
    }
  }

  return nodes.size ? [...nodes] : [document.createTextNode('')];
}

/**
 * Flattens nested arrays with a stack instead of recursion, so very deep arrays cannot overflow it.
 * @param {unknown} value
 * @returns {unknown[]}
 */
function flatten(value) {
  /** @type {unknown[]} */
  const items = [];
  const stack = [value];
  while (stack.length > 0) {
    const item = stack.pop();
    if (Array.isArray(item)) {
      for (let i = item.length - 1; i >= 0; i--) {
        stack.push(item[i]);
      }
    } else {
      items.push(item);
    }
  }
  return items;
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
