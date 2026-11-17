import {
  LIVE,
  SLOT,
  applyAttribute,
  assignProperty,
  bindChild,
  fragment,
  isLive,
  recordInto,
  replaceChildren,
} from './base.js';

/** @import { Recorded } from './base.js' */

/**
 * @typedef {Recorded & { steps: number[] }} Slot
 * @typedef {{ root: Node, slots: Slot[] }} Prepared
 */

/**
 * A structure built once and cloned for every call. `build` gets `slot`, whose properties are placeholders: put
 * `slot.name` where a value of the call goes, as a prop, an attribute, a child or a listener. The first call runs
 * `build` and records where each placeholder lands; every call clones the result with one `cloneNode` and puts the
 * values of `values` in those places, signals bound as usual. The structure is the same for every call, so `build`
 * must not depend on the values, and everything that varies goes through a slot.
 * @template {Node} N
 * @param {(slot: Record<string, any>) => N} build
 * @returns {(values: Record<string, unknown>) => N}
 */
export function blueprint(build) {
  /** @type {Prepared | undefined} */
  let prepared;
  return (values) => {
    prepared ??= prepare(build);
    return /** @type {N} */ (instantiate(prepared, values));
  };
}

/** @type {ProxyHandler<object>} */
const slotNames = {
  get: (_, name) => (typeof name === 'string' ? placeholder(name) : undefined),
};

/**
 * A placeholder is a function, so it fits where a listener goes, with a [LIVE] method that records where core binds it.
 * @param {string} name
 */
function placeholder(name) {
  const marker = /** @type {any} */ (() => {});
  marker[SLOT] = name;
  marker[LIVE] = (/** @type {unknown} */ _apply, /** @type {any} */ context) => {
    if (context.kind === 'child') {
      const only = context.anchor === context.element;
      current.push({ kind: 'child', name, node: context.anchor, only });
    } else {
      current.push({ kind: context.kind, name, node: context.element, key: context.name, path: context.path });
    }
  };
  return marker;
}

/** @type {Recorded[]} */
let current = [];

/**
 * @param {(slot: Record<string, any>) => Node} build
 * @returns {Prepared}
 */
function prepare(build) {
  /** @type {Recorded[]} */
  const found = [];
  const outer = current;
  current = found;
  const previous = recordInto(found);
  /** @type {Node} */
  let root;
  try {
    root = build(new Proxy({}, slotNames));
  } finally {
    recordInto(previous);
    current = outer;
  }
  return { root, slots: found.map((item) => ({ ...item, steps: pathTo(root, item.node) })) };
}

/**
 * The child indexes from `root` down to `node`.
 * @param {Node} root
 * @param {Node} node
 */
function pathTo(root, node) {
  /** @type {number[]} */
  const path = [];
  for (let current = node; current !== root; current = /** @type {Node} */ (current.parentNode)) {
    let index = 0;
    for (let sibling = current.previousSibling; sibling; sibling = sibling.previousSibling) {
      index++;
    }
    path.push(index);
  }
  return path.reverse();
}

/**
 * @param {Node} root
 * @param {number[]} path
 */
function walk(root, path) {
  let node = root;
  for (let i = 0; i < path.length; i++) {
    node = /** @type {Node} */ (node.firstChild);
    for (let step = /** @type {number} */ (path[i]); step > 0; step--) {
      node = /** @type {Node} */ (node.nextSibling);
    }
  }
  return node;
}

/**
 * @param {Prepared} prepared
 * @param {Record<string, unknown>} values
 */
function instantiate(prepared, values) {
  const root = prepared.root.cloneNode(true);
  const slots = prepared.slots;
  // Every place is found before any value goes in, since a child value adds nodes that would shift the paths.
  const nodes = slots.map((slot) => walk(root, slot.steps));
  for (let i = 0; i < slots.length; i++) {
    const slot = /** @type {Slot} */ (slots[i]);
    const node = /** @type {any} */ (nodes[i]);
    if (slot.kind === 'callback') {
      /** @type {(element: Element) => void} */ (slot.fn)(node);
      continue;
    }
    const value = values[/** @type {string} */ (slot.name)];
    if (slot.kind === 'listener') {
      node.addEventListener(slot.key, value, slot.options);
    } else if (slot.kind === 'attribute') {
      const name = /** @type {string} */ (slot.key);
      if (isLive(value)) {
        value[LIVE]((/** @type {unknown} */ next) => applyAttribute(node, name, next), { element: node, kind: 'attribute', name });
      } else {
        applyAttribute(node, name, value);
      }
    } else if (slot.kind === 'property') {
      const path = /** @type {string[]} */ (slot.path);
      const at = path.slice(0, -1);
      const name = /** @type {string} */ (path[path.length - 1]);
      let target = node;
      for (const key of at) {
        target = target[key];
      }
      if (isLive(value)) {
        value[LIVE]((/** @type {unknown} */ next) => assignProperty(target, name, next, node, at), {
          element: node,
          kind: 'property',
          name,
          path,
        });
      } else {
        assignProperty(target, name, value, node, at);
      }
    } else if (slot.only) {
      if (isLive(value)) {
        bindChild(node, value, null, null);
      } else {
        replaceChildren(node, /** @type {any} */ (value));
      }
    } else {
      const start = node;
      const end = start.nextSibling;
      if (isLive(value)) {
        bindChild(start.parentNode, value, start, end);
      } else {
        // A fixed value needs no markers, as in a normal build.
        start.replaceWith(fragment(/** @type {any} */ (value)));
        end.remove();
      }
    }
  }
  return root;
}
