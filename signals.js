import { use } from 'fiorejs';

const SIGNAL = Symbol.for('fiorejs.signal');

/**
 * @typedef {{ subs: Set<Computation>, release?(): void }} Source
 * @typedef {{ sources: Set<Source>, stale(): void }} Computation
 * @typedef {{ owned: (() => void)[] }} Owner
 */

/** @type {Computation | null} */
let current = null;
/** @type {Owner | null} */
let owner = null;
/** @type {Set<{ run(): void }>} */
const pending = new Set();
let flushing = false;

/** How often one effect may run in a single update before it counts as a loop. */
const MAX_RUNS = 100;

/** @param {Source} source */
function track(source) {
  if (current) {
    source.subs.add(current);
    current.sources.add(source);
  }
}

/** @param {Source} source */
function notify(source) {
  for (const sub of [...source.subs]) {
    sub.stale();
  }
  flush();
}

function flush() {
  if (flushing) {
    return;
  }
  flushing = true;
  /** @type {Map<object, number>} */
  const runs = new Map();
  /** @type {unknown[]} */
  const errors = [];
  try {
    for (const effect of pending) {
      pending.delete(effect);
      const count = (runs.get(effect) ?? 0) + 1;
      runs.set(effect, count);
      if (count > MAX_RUNS) {
        pending.clear();
        throw new Error(`An effect ran more than ${MAX_RUNS} times in one update; it probably sets a signal it reads.`);
      }
      // One failing effect must not stop the others; the first error is rethrown afterwards.
      try {
        effect.run();
      } catch (error) {
        errors.push(error);
      }
    }
  } finally {
    flushing = false;
  }
  if (errors.length > 0) {
    throw errors[0];
  }
}

/** @param {Computation} computation */
function untrackSources(computation) {
  for (const source of computation.sources) {
    source.subs.delete(computation);
    if (source.subs.size === 0) {
      source.release?.();
    }
  }
  computation.sources.clear();
}

/**
 * @template T
 * @param {Computation | null} computation
 * @param {Owner | null} nextOwner
 * @param {() => T} fn
 * @returns {T}
 */
function runIn(computation, nextOwner, fn) {
  const [previous, previousOwner] = [current, owner];
  current = computation;
  owner = nextOwner;
  try {
    return fn();
  } finally {
    current = previous;
    owner = previousOwner;
  }
}

/**
 * A value that can be read and written; reading it inside an effect or computed subscribes.
 * @template T
 * @param {T} value
 */
export function state(value) {
  /** @type {Source} */
  const source = { subs: new Set() };

  /** @param {T} next */
  function set(next) {
    if (!Object.is(next, value)) {
      value = next;
      notify(source);
    }
  }

  return {
    [SIGNAL]: true,
    get() {
      track(source);
      return value;
    },
    set,
    /**
     * Sets the value that `fn` returns for the current value, for example `(count) => count + 1`.
     * @param {(value: T) => T} fn
     */
    update(fn) {
      set(fn(value));
    },
    /**
     * Changes the value in place, for example with `list.push(item)`, and always notifies.
     * @param {(value: T) => unknown} fn
     */
    mutate(fn) {
      fn(value);
      notify(source);
    },
  };
}

/**
 * A cached value derived from other signals; recalculated on read after an input changed.
 * @template T
 * @param {() => T} fn
 */
export function computed(fn) {
  /** @type {T} */
  let value;
  let dirty = true;
  /** @type {Source & Computation} */
  const node = {
    subs: new Set(),
    sources: new Set(),
    stale() {
      if (!dirty) {
        dirty = true;
        for (const sub of [...node.subs]) {
          sub.stale();
        }
      }
    },
    release,
  };

  // Without readers a computed lets go of its sources, so it can be collected and is not visited on every set.
  function release() {
    untrackSources(node);
    dirty = true;
  }

  return {
    [SIGNAL]: true,
    get() {
      if (dirty) {
        untrackSources(node);
        value = runIn(node, null, fn);
        dirty = false;
      }
      track(node);
      if (node.subs.size === 0) {
        release();
      }
      return value;
    },
  };
}

/**
 * Runs `fn` now and again whenever a signal it read changes; returns a function that stops it.
 * `fn` may return a cleanup function, called before the next run and when stopped.
 * @param {() => void | (() => void)} fn
 * @returns {() => void}
 */
export function effect(fn) {
  /** @type {(() => void) | void} */
  let cleanup;
  let stopped = false;
  /** @type {Owner} */
  const scope = { owned: [] };
  /** @type {Computation & { run(): void }} */
  const node = {
    sources: new Set(),
    stale: () => pending.add(node),
    run() {
      if (stopped) {
        return;
      }
      reset();
      const result = runIn(node, scope, fn);
      cleanup = typeof result === 'function' ? result : undefined;
      // Stopped during its own run: undo what the run set up after the stop.
      if (stopped) {
        reset();
      }
    },
  };

  function reset() {
    untrackSources(node);
    scope.owned.splice(0).forEach((stop) => stop());
    cleanup?.();
    cleanup = undefined;
  }

  function stop() {
    stopped = true;
    pending.delete(node);
    reset();
  }

  owner?.owned.push(stop);
  node.run();
  return stop;
}

/**
 * Runs `fn` without subscribing to the signals it reads and without an owning effect.
 * @template T
 * @param {() => T} fn
 * @returns {T}
 */
export function untrack(fn) {
  return runIn(null, null, fn);
}

/**
 * @param {unknown} value
 * @returns {value is { get(): unknown }}
 */
export function isSignal(value) {
  return typeof value === 'object' && value !== null && SIGNAL in value;
}

/**
 * Returns the current value of a signal, a getter or a plain value.
 * @template T
 * @param {import('./signals.d.ts').Reactive<T>} value
 * @returns {T}
 */
export function read(value) {
  if (isSignal(value)) {
    return /** @type {T} */ (value.get());
  }
  return typeof value === 'function' ? /** @type {() => T} */ (value)() : /** @type {T} */ (value);
}

/**
 * Renders a list and reuses the nodes of items whose key is unchanged. `index` is the item's index when its row
 * was created; a reused row keeps it.
 * @template T
 * @param {import('./signals.d.ts').Reactive<readonly T[]>} items
 * @param {(item: T, index: number) => Node} render
 * @param {(item: T) => unknown} [key]
 */
export function each(items, render, key = (item) => item) {
  /** @typedef {{ node: Node, stop: () => void }} Row */
  /** @type {Map<unknown, Row[]>} Rows by key; a repeated key keeps one row per occurrence. */
  let rows = new Map();

  const stopAll = () => {
    for (const list of rows.values()) {
      list.forEach((row) => row.stop());
    }
    rows = new Map();
  };
  owner?.owned.push(stopAll);

  return () => {
    /** @type {typeof rows} */
    const next = new Map();
    const nodes = read(items).map((item, index) => {
      const id = key(item);
      const row = rows.get(id)?.shift() ?? createRow(() => render(item, index));
      const list = next.get(id);
      if (list) {
        list.push(row);
      } else {
        next.set(id, [row]);
      }
      return row.node;
    });

    stopAll();
    rows = next;
    return nodes;
  };
}

/**
 * @param {() => Node} render
 * @returns {{ node: Node, stop: () => void }}
 */
function createRow(render) {
  /** @type {Owner} */
  const scope = { owned: [] };
  const node = runIn(null, scope, render);
  return { node, stop: () => scope.owned.splice(0).forEach((stop) => stop()) };
}

/**
 * @typedef {{ start: () => () => void, stop?: () => void, disposed?: boolean }} Binding
 */

/** @type {WeakMap<Element, Binding[]>} Bindings by element, held weakly so a dropped element can be collected. */
const bindings = new WeakMap();
let observing = false;

/** Pauses the bindings of elements that leave the document and resumes them when they come back. */
function observe() {
  if (observing || typeof MutationObserver === 'undefined') {
    return;
  }
  observing = true;
  new MutationObserver((records) => {
    for (const record of records) {
      record.removedNodes.forEach((node) => visit(node, pause));
      record.addedNodes.forEach((node) => visit(node, resume));
    }
  }).observe(document, { childList: true, subtree: true });
}

/**
 * Calls `fn` for an element node and every element below it.
 * @param {Node} node
 * @param {(element: Element) => void} fn
 */
function visit(node, fn) {
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return;
  }
  const element = /** @type {Element} */ (node);
  fn(element);
  element.querySelectorAll('*').forEach(fn);
}

/** @param {Element} element */
function pause(element) {
  if (element.isConnected) {
    return;
  }
  for (const binding of bindings.get(element) ?? []) {
    binding.stop?.();
    binding.stop = undefined;
  }
}

/** @param {Element} element */
function resume(element) {
  if (!element.isConnected) {
    return;
  }
  for (const binding of bindings.get(element) ?? []) {
    if (!binding.stop && !binding.disposed) {
      binding.stop = binding.start();
    }
  }
}

/** @type {import('fiorejs/type/base.dom.d.ts').Plugin} */
export const plugin = {
  name: 'fiorejs-signals',
  bind(value, apply, context) {
    const isListener = context.kind === 'property' && context.name.startsWith('on');
    if (!isSignal(value) && (typeof value !== 'function' || isListener)) {
      return false;
    }
    const getter = isSignal(value) ? () => value.get() : /** @type {() => unknown} */ (value);

    /** @type {Binding} */
    const binding = { start: () => runIn(null, null, () => effect(() => apply(getter()))) };
    binding.stop = binding.start();
    // The surrounding effect or list row stops the binding for good when it reruns or is removed.
    owner?.owned.push(() => {
      binding.disposed = true;
      binding.stop?.();
      binding.stop = undefined;
    });

    const list = bindings.get(context.element);
    if (list) {
      list.push(binding);
    } else {
      bindings.set(context.element, [binding]);
    }
    observe();
    return true;
  },
};

use(plugin);
