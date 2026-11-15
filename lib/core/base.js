import { bind, plugins } from './plugins.js';

/** @import { BaseElement, Children } from '../types/base.dom.d.ts' */

/** Keys that would reach Object.prototype or a constructor when followed. */
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** Attributes whose "false" value means something, so false is written instead of removing them. */
const ENUMERATED = new Set(['contenteditable', 'draggable', 'spellcheck']);

/** Properties that depend on the attributes or children, so they are assigned after both. */
const LATE_PROPS = new Set(['value', 'selectedIndex', 'checked']);

/** Children are passed as arguments in chunks of this size, so a very long list cannot overflow the argument limit. */
const SPREAD_LIMIT = 10000;

/** @type {WeakMap<ChildNode, { release(node: ChildNode): void }>} The bound child slot each node was placed by. */
const owners = new WeakMap();

/** @type {WeakSet<Text>} Text nodes a slot created itself, which it may update in place. */
const ownTexts = new WeakSet();

/**
 * Whether a name is an inline event handler of the element, such as onclick, which is never set as an attribute or
 * offered to plugins; names such as online are not handlers.
 * @param {BaseElement} element
 * @param {string} name
 */
function isHandler(element, name) {
  return /^on/i.test(name) && name.toLowerCase() in element;
}

/**
 * Assigns the props except `value`, `selectedIndex` and `checked`, or only those when `late` is true.
 * @param {Element} element
 * @param {object | null | undefined} props
 * @param {boolean} [late]
 */
export function assignProperties(element, props, late = false) {
  assignNested(element, props, element, [], (name) => LATE_PROPS.has(name) === late);
}

/**
 * Assigns own keys only, so polluted prototypes and JSON `__proto__` keys never reach the element. Nested plain objects
 * merge into the existing objects, such as `style` or `dataset`, through a stack instead of recursion.
 * @param {any} target
 * @param {object | null | undefined} props
 * @param {BaseElement} element
 * @param {string[]} path
 * @param {(name: string) => boolean} [include]
 */
function assignNested(target, props, element, path, include) {
  /** @type {Array<[any, object, string[], ((name: string) => boolean) | undefined]>} */
  const assignments = props ? [[target, props, path, include]] : [];
  /** @type {Set<object>} Objects already merged; meeting one again, in a cycle, assigns it whole. */
  const merged = new Set();

  for (let item = assignments.pop(); item; item = assignments.pop()) {
    const [into, from, at, filter] = item;
    for (const [name, value] of Object.entries(from)) {
      if (UNSAFE_KEYS.has(name) || (filter && !filter(name))) {
        continue;
      }
      // Inline handlers exist only as top-level element properties, so nested keys such as dataset.onboarding pass.
      if (plugins.length > 0 && !(at.length === 0 && isHandler(element, name))) {
        const apply = (/** @type {unknown} */ next) => assignProperty(into, name, next, element, at);
        if (bind(value, apply, { element, kind: 'property', name, path: [...at, name] })) {
          continue;
        }
      }
      // The current value is only read for plain objects, so getters such as innerHTML are not run on every update.
      if (isPlainObject(value) && !merged.has(value)) {
        const current = into[name];
        if (isMergeTarget(current)) {
          merged.add(value);
          assignments.push([current, value, [...at, name], undefined]);
          continue;
        }
      }
      if (value !== undefined) {
        into[name] = value;
      }
    }
  }
}

/**
 * Applies one value, as a plugin does when a live value changes. Undefined leaves the property unchanged.
 * @param {any} target
 * @param {string} name
 * @param {unknown} value
 * @param {BaseElement} element
 * @param {string[]} path
 */
function assignProperty(target, name, value, element, path) {
  if (isPlainObject(value)) {
    const current = target[name];
    if (isMergeTarget(current)) {
      assignNested(current, value, element, [...path, name]);
      return;
    }
  }
  if (value !== undefined) {
    target[name] = value;
  }
}

/**
 * Whether a property holds an object that plain objects merge into, such as `style` or `dataset`.
 * @param {unknown} current
 */
function isMergeTarget(current) {
  return typeof current === 'object' && current !== null && !isDomRoot(current);
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
export function isPlainObject(value) {
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
 * @param {Element} element
 * @param {object | null | undefined} attributes
 */
export function setAttributes(element, attributes) {
  if (!attributes) {
    return;
  }

  for (const [name, value] of Object.entries(attributes)) {
    // Inline handlers run strings as script; listeners belong in `on`.
    if (isHandler(element, name)) {
      continue;
    }
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
    if (plugins.length === 0) {
      nodes.push(/** @type {Node | string} */ (child));
    } else {
      for (const node of childNodes(element, child)) {
        nodes.push(node);
      }
    }
  }

  // Nothing to insert: keep what props such as textContent or innerHTML put there.
  if (nodes.length > SPREAD_LIMIT) {
    element.replaceChildren();
    for (let i = 0; i < nodes.length; i += SPREAD_LIMIT) {
      element.append(...nodes.slice(i, i + SPREAD_LIMIT));
    }
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

  const slot = {
    /**
     * Gives up a node another slot takes; a slot left without nodes keeps an empty placeholder where the node was.
     * @param {ChildNode} node
     */
    release(node) {
      current = current.filter((other) => other !== node);
      if (current.length === 0) {
        ownText = createText('');
        current = [ownText];
        owners.set(ownText, slot);
        node.before(ownText);
      }
    },
  };

  const apply = (/** @type {unknown} */ value) => {
    if (ownText && current.length === 1 && current[0] === ownText && isText(value)) {
      ownText.data = String(value);
      return;
    }

    const next = toNodes(value);
    const first = /** @type {Text} */ (next[0]);
    ownText = next.length === 1 && ownTexts.has(first) ? first : null;
    for (const node of next) {
      const owner = owners.get(node);
      if (owner !== slot) {
        owner?.release(node);
        owners.set(node, slot);
      }
    }
    const parent = current[0]?.parentNode;
    if (parent) {
      move(parent, current, next);
    }
    current = next;
  };

  if (bind(child, apply, { element, kind: 'child', nodes: () => current })) {
    if (current.length === 0) {
      apply(null);
    }
    return current;
  }

  return [/** @type {Node | string} */ (child)];
}

/**
 * Replaces the nodes of a slot, moving only kept nodes that are out of order, then removing dropped nodes. If an
 * insert throws, the slot is put back as it was, so a later update still applies.
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
    }
  });

  const stay = increasingRun(next.map((node) => oldIndex.get(node) ?? -1));
  let anchor = end;
  try {
    for (let i = next.length - 1; i >= 0; i--) {
      const node = /** @type {ChildNode} */ (next[i]);
      if (!stay.has(i)) {
        place(parent, node, anchor);
      }
      anchor = node;
    }
  } catch (error) {
    for (const node of next) {
      if (!oldIndex.has(node) && node.parentNode === parent) {
        node.remove();
      }
    }
    for (const node of current) {
      parent.insertBefore(node, end);
    }
    throw error;
  }

  for (const node of current) {
    if (!kept.has(node)) {
      node.remove();
    }
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
      nodes.add(createText(String(item)));
    }
  }

  return nodes.size ? [...nodes] : [createText('')];
}

/** @param {string} data */
function createText(data) {
  const text = document.createTextNode(data);
  ownTexts.add(text);
  return text;
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
 * Adds the listeners of an `on` map: a function, or an object with `handler` and `options`.
 * @param {Element} element
 * @param {object | null | undefined} eventData
 */
export function attachEventListener(element, eventData) {
  if (eventData == null) {
    return;
  }
  for (const [key, event] of Object.entries(eventData)) {
    if (typeof event === 'function') {
      element.addEventListener(key, event);
    } else if (event && typeof event === 'object' && event.handler) {
      element.addEventListener(key, event.handler, event.options ?? undefined);
    }
  }
}
