import { flatten, increasingRun, isPlainObject, isText } from './utils.js';

/** @import { BaseElement, Children, LiveValue } from '../types/base.dom.d.ts' */

/** The key of the method that makes a value live; global, so live values work across copies of fiorejs. */
export const LIVE = Symbol.for('fiorejs.live');

/** Keys that would reach Object.prototype or a constructor when followed. */
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** Attributes whose "false" value means something, so false is written instead of removing them. */
const ENUMERATED = new Set(['contenteditable', 'draggable', 'spellcheck']);

/** Properties that depend on the attributes or children, so they are assigned after both. */
const LATE_PROPS = new Set(['value', 'selectedIndex', 'checked']);

/**
 * Whether a name is an inline event handler of the element, such as onclick, which is never set as an attribute;
 * names such as online are not handlers.
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
      if (isLive(value)) {
        const apply = (/** @type {unknown} */ next) => assignProperty(into, name, next, element, at);
        value[LIVE](apply, { element, kind: 'property', name, path: [...at, name] });
        continue;
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
 * Applies one value of a live property when it changes. Undefined leaves the property unchanged.
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
    if (isLive(value)) {
      value[LIVE]((next) => applyAttribute(element, name, next), { element, kind: 'attribute', name });
    } else {
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
  const list = children == null ? [] : flatten(children);

  let first = true;
  for (const child of list) {
    if (child == null || typeof child === 'boolean') {
      continue;
    }
    // The first child replaces what props such as textContent or innerHTML put there; without children it stays.
    if (first && element.firstChild) {
      element.replaceChildren();
    }
    first = false;
    if (isLive(child)) {
      liveChild(element, child, list.length === 1);
    } else {
      element.append(/** @type {Node | string} */ (child));
    }
  }
}

/**
 * Binds a live child. It lives between two comment markers, or, as the only child, fills the element. Its nodes there
 * are its only state, so it keeps working when another live child takes one of them, and with markers also when its
 * nodes move to another parent.
 * @param {BaseElement} element
 * @param {LiveValue<unknown>} child
 * @param {boolean} only
 */
function liveChild(element, child, only) {
  const start = only ? null : element.appendChild(document.createComment(''));
  const end = only ? null : element.appendChild(document.createComment(''));
  /** @type {Text | undefined} The text node of this child, so a text update only writes its data. */
  let text;

  const apply = (/** @type {unknown} */ value) => {
    const parent = start ? start.parentNode : element;
    if (!parent) {
      return;
    }
    if (!isText(value)) {
      update(parent, start, end, toNodes(value));
      return;
    }
    text ??= document.createTextNode('');
    text.data = String(value);
    if (text.parentNode !== parent || text.previousSibling !== start || text.nextSibling !== end) {
      update(parent, start, end, [text]);
    }
  };

  child[LIVE](apply, { element, kind: 'child', anchor: start ?? element });
}

/**
 * Makes `next` the nodes of `parent` between `start` and `end`; null bounds mean the first and the last child. Nodes
 * already in place at either end are stepped over; of the rest, the longest run that is already in order stays and
 * only the others move.
 * @param {ParentNode} parent
 * @param {ChildNode | null} start
 * @param {ChildNode | null} end
 * @param {ChildNode[]} next
 */
function update(parent, start, end, next) {
  let from = 0;
  let to = next.length;
  let first = start ? start.nextSibling : parent.firstChild;
  while (first && first === next[from]) {
    start = first;
    first = first.nextSibling;
    from++;
  }
  let last = end ? end.previousSibling : parent.lastChild;
  while (last && to > from && last === next[to - 1]) {
    end = last;
    last = last.previousSibling;
    to--;
  }
  const middle = next.slice(from, to);
  // Nothing is left between the bounds, so the rest is only inserted.
  if (first === end) {
    insert(parent, middle, end);
    return;
  }

  /** @type {Map<ChildNode, number>} */
  const old = new Map();
  let node = first;
  while (node && node !== end) {
    old.set(node, old.size);
    node = node.nextSibling;
  }
  // The end marker is gone or no longer follows the start marker, so the nodes after it are not this child's.
  if (node !== end) {
    return;
  }

  const positions = middle.map((item) => old.get(item) ?? -1);
  // No old node stays: remove them all at once and insert the new ones.
  if (positions.every((position) => position < 0)) {
    const range = document.createRange();
    if (start) {
      range.setStartAfter(start);
    } else {
      range.setStart(parent, 0);
    }
    if (end) {
      range.setEndBefore(end);
    } else {
      range.setEnd(parent, parent.childNodes.length);
    }
    range.deleteContents();
    insert(parent, middle, end);
    return;
  }

  const stay = increasingRun(positions);
  let previous = start;
  for (const [i, item] of middle.entries()) {
    if (!stay.has(i)) {
      place(parent, item, previous ? previous.nextSibling : parent.firstChild);
    }
    old.delete(item);
    previous = item;
  }

  for (const node of old.keys()) {
    node.remove();
  }
}

/**
 * Inserts nodes before `anchor`. Nodes that are not in the document, or a parent that is not, go in one step through
 * a fragment; otherwise each node is placed on its own, so `moveBefore` keeps the state of nodes that move.
 * @param {ParentNode} parent
 * @param {ChildNode[]} nodes
 * @param {ChildNode | null} anchor
 */
function insert(parent, nodes, anchor) {
  if (parent.isConnected && nodes.some((node) => node.isConnected)) {
    for (const node of nodes) {
      place(parent, node, anchor);
    }
    return;
  }
  const fragment = document.createDocumentFragment();
  for (const node of nodes) {
    fragment.appendChild(node);
  }
  parent.insertBefore(fragment, anchor);
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
 * Whether the value is live: an object or a function with a [LIVE] method.
 * @param {unknown} value
 * @returns {value is LiveValue<unknown>}
 */
export function isLive(value) {
  return (
    (typeof value === 'object' || typeof value === 'function') &&
    value !== null &&
    typeof Reflect.get(value, LIVE) === 'function'
  );
}

/**
 * Turns a bound child value into nodes.
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
      if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
        for (const child of node.childNodes) {
          nodes.add(child);
        }
      } else {
        nodes.add(node);
      }
    } else {
      nodes.add(document.createTextNode(String(item)));
    }
  }
  return [...nodes];
}

/**
 * Adds the listeners of an `on` map: a function, or an object with `handler` and `options`.
 * @param {Element} element
 * @param {object} eventData
 */
export function attachEventListener(element, eventData) {
  for (const [key, event] of Object.entries(eventData)) {
    if (typeof event === 'function') {
      element.addEventListener(key, event);
    } else if (event && typeof event === 'object' && event.handler) {
      element.addEventListener(key, event.handler, event.options);
    }
  }
}
