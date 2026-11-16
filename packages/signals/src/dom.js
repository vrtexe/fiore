import { effect, owner, untrack } from './tracking.js';
import { report } from './scheduler.js';

/**
 * @typedef {{
 *   anchor: Node,
 *   start: () => () => void,
 *   stop?: () => void,
 * }} Binding
 */

/**
 * Bindings by the node whose place in the document they follow: the element for a property, an attribute or an only
 * child, the start comment for any other child, which moves with its nodes, for example out of a fragment.
 * @type {WeakMap<Node, Set<Binding>>}
 */
const bindings = new WeakMap();

let observing = false;

/** Pauses the bindings of nodes that leave the document and resumes them when they come back. */
function observe() {
  if (observing || typeof MutationObserver === 'undefined') {
    return;
  }
  observing = true;
  new MutationObserver((records) => {
    /** @type {Set<Node>} */
    const removed = new Set();
    /** @type {Set<Node>} */
    const added = new Set();
    for (const record of records) {
      record.removedNodes.forEach((node) => removed.add(node));
      record.addedNodes.forEach((node) => added.add(node));
    }
    roots(removed).forEach((node) => visit(node, pause));
    roots(added).forEach((node) => visit(node, resume));
  }).observe(document, { childList: true, subtree: true });
}

/**
 * Drops nodes with an ancestor in the same batch, because walking the ancestor covers them; a deep tree appended
 * level by level is then walked once instead of once per level.
 * @param {Set<Node>} nodes
 */
function roots(nodes) {
  return [...nodes].filter((node) => {
    for (let parent = node.parentNode; parent; parent = parent.parentNode) {
      if (nodes.has(parent)) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Calls `fn` for every binding that follows `node` or a node below it; an error is reported and does not stop the
 * others.
 * @param {Node} node
 * @param {(binding: Binding) => void} fn
 */
function visit(node, fn) {
  const walker = document.createTreeWalker(node, 1 | 128 /* elements and comments */);
  for (let current = /** @type {Node | null} */ (node); current; current = walker.nextNode()) {
    const set = bindings.get(current);
    if (!set) {
      continue;
    }
    for (const binding of [...set]) {
      try {
        fn(binding);
      } catch (error) {
        report(error);
      }
    }
  }
}

/** @param {Binding} binding */
function pause(binding) {
  if (!binding.anchor.isConnected) {
    // Cleared first, so a stop that throws still leaves the binding ready to resume.
    const stop = binding.stop;
    binding.stop = undefined;
    stop?.();
  }
}

/** @param {Binding} binding */
function resume(binding) {
  if (!binding.stop && binding.anchor.isConnected) {
    binding.stop = binding.start();
  }
}

/**
 * Binds `read` to an element: `apply` gets its value now and whenever a signal it read changes, while its anchor is in
 * the document.
 * @param {() => unknown} read
 * @param {(value: unknown) => void} apply
 * @param {import('fiorejs/type/base.dom.d.ts').BindContext} context
 */
export function attach(read, apply, context) {
  /** @type {Binding} */
  const binding = {
    anchor: context.kind === 'child' ? context.anchor : context.element,
    start: () => untrack(() => effect(() => apply(read()))),
  };
  // Filed under its anchor, so the observer finds it when the anchor is added or removed.
  let set = bindings.get(binding.anchor);
  if (!set) {
    set = new Set();
    bindings.set(binding.anchor, set);
  }
  set.add(binding);
  binding.stop = binding.start();
  // The surrounding effect or list row ends the binding for good when it reruns or is removed.
  owner?.owned.push(() => {
    bindings.get(binding.anchor)?.delete(binding);
    binding.stop?.();
    binding.stop = undefined;
  });
  observe();
}
