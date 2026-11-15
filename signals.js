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

/**
 * Calls every function even when some of them throw, then rethrows the first error.
 * @param {Iterable<() => void>} fns
 */
function runAll(fns) {
  /** @type {unknown[]} */
  const errors = [];
  for (const fn of fns) {
    try {
      fn();
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length > 0) {
    throw errors[0];
  }
}

/**
 * Unsubscribes a computation from sources; a source left without subscribers releases its own sources.
 * @param {Computation} computation
 * @param {Iterable<Source>} sources
 */
function unsubscribe(computation, sources) {
  for (const source of sources) {
    source.subs.delete(computation);
    if (source.subs.size === 0) {
      source.release?.();
    }
  }
}

/** @param {Computation} computation */
function untrackSources(computation) {
  const sources = computation.sources;
  computation.sources = new Set();
  unsubscribe(computation, sources);
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
 * Runs `fn` for a computation, then unsubscribes only from the sources this run no longer read, so a source that
 * is read again, a computed in particular, keeps its subscription and its cached value.
 * @template T
 * @param {Computation} computation
 * @param {Owner | null} nextOwner
 * @param {() => T} fn
 * @returns {T}
 */
function runTracked(computation, nextOwner, fn) {
  const previous = computation.sources;
  computation.sources = new Set();
  try {
    return runIn(computation, nextOwner, fn);
  } finally {
    unsubscribe(
      computation,
      [...previous].filter((source) => !computation.sources.has(source)),
    );
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
        value = runTracked(node, null, fn);
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
 * If the first run throws, the effect is stopped and the error is thrown.
 * @param {() => void | (() => void)} fn
 * @returns {() => void}
 */
export function effect(fn) {
  /** @type {(() => void) | undefined} */
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
      // A cleanup or an owned effect that throws must not keep this effect from running.
      /** @type {{ error: unknown } | undefined} */
      let failure;
      try {
        reset();
      } catch (error) {
        failure = { error };
      }
      const result = runTracked(node, scope, fn);
      cleanup = typeof result === 'function' ? result : undefined;
      // Stopped during its own run: undo what the run set up after the stop.
      if (stopped) {
        stop();
      }
      if (failure) {
        throw failure.error;
      }
    },
  };

  /** Stops the effects created by the last run and calls its cleanup, keeping the subscriptions. */
  function reset() {
    const owned = scope.owned.splice(0);
    const done = cleanup;
    cleanup = undefined;
    runAll(done ? [...owned, done] : owned);
  }

  function stop() {
    stopped = true;
    pending.delete(node);
    try {
      reset();
    } finally {
      untrackSources(node);
    }
  }

  owner?.owned.push(stop);
  try {
    node.run();
  } catch (error) {
    stop();
    throw error;
  }
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
 * @typedef {{ node: Node, stop: () => void }} Row
 */

/**
 * Renders a list and reuses the nodes of items whose key is unchanged. `index` is the item's index when its row
 * was created; a reused row keeps it.
 * @template T
 * @param {import('./signals.d.ts').Reactive<readonly T[]>} items
 * @param {(item: T, index: number) => Node} render
 * @param {(item: T) => unknown} [key]
 */
export function each(items, render, key = (item) => item) {
  /** @type {Map<unknown, Row[]>} Rows by key; a repeated key keeps one row per occurrence. */
  let rows = new Map();

  owner?.owned.push(() => {
    const old = rows;
    rows = new Map();
    runAll([...old.values()].flat().map((row) => row.stop));
  });

  return () => {
    /** @type {Map<unknown, Row[]>} */
    const next = new Map();
    /** @type {Map<unknown, number>} */
    const taken = new Map();
    /** @type {Row[]} */
    const created = [];
    /** @type {Node[]} */
    let nodes;
    try {
      nodes = read(items).map((item, index) => {
        const id = key(item);
        const used = taken.get(id) ?? 0;
        let row = rows.get(id)?.[used];
        if (row) {
          taken.set(id, used + 1);
        } else {
          row = createRow(() => render(item, index));
          created.push(row);
        }
        const list = next.get(id);
        if (list) {
          list.push(row);
        } else {
          next.set(id, [row]);
        }
        return row.node;
      });
    } catch (error) {
      // The old rows stay as they were; only the rows made in this failed pass are stopped.
      try {
        runAll(created.map((row) => row.stop));
      } catch {
        // The render error is the one worth reporting.
      }
      throw error;
    }

    const kept = new Set([...next.values()].flat());
    const old = rows;
    rows = next;
    runAll([...old.values()].flat().filter((row) => !kept.has(row)).map((row) => row.stop));
    return nodes;
  };
}

/**
 * @param {() => Node} render
 * @returns {Row}
 */
function createRow(render) {
  /** @type {Owner} */
  const scope = { owned: [] };
  const stop = () => runAll(scope.owned.splice(0));
  try {
    return { node: runIn(null, scope, render), stop };
  } catch (error) {
    try {
      stop();
    } catch {
      // The render error is the one worth reporting.
    }
    throw error;
  }
}

/**
 * @typedef {{
 *   anchor: () => Node | undefined,
 *   keyed?: Node,
 *   start: () => () => void,
 *   stop?: () => void,
 * }} Binding
 */

/**
 * Bindings by the node whose place in the document they follow: the element for a property or attribute, the first
 * node of the slot for a child, which moves with the slot, for example out of a fragment.
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
    for (const record of records) {
      record.removedNodes.forEach((node) => visit(node, pause));
      record.addedNodes.forEach((node) => visit(node, resume));
    }
  }).observe(document, { childList: true, subtree: true });
}

/**
 * Calls `fn` for every binding that follows `node` or a node below it; an error is reported and does not stop the
 * others.
 * @param {Node} node
 * @param {(binding: Binding) => void} fn
 */
function visit(node, fn) {
  const walker = document.createTreeWalker(node, 1 | 4 /* elements and text */);
  for (let current = /** @type {Node | null} */ (node); current; current = walker.nextNode()) {
    for (const binding of [...(bindings.get(current) ?? [])]) {
      try {
        fn(binding);
      } catch (error) {
        report(error);
      }
    }
  }
}

/** @param {unknown} error */
function report(error) {
  if (typeof globalThis.reportError === 'function') {
    globalThis.reportError(error);
  } else {
    console.error(error);
  }
}

/** @param {Binding} binding */
function pause(binding) {
  if (!binding.anchor()?.isConnected) {
    binding.stop?.();
    binding.stop = undefined;
  }
}

/** @param {Binding} binding */
function resume(binding) {
  if (!binding.stop && binding.anchor()?.isConnected) {
    binding.stop = binding.start();
  }
}

/**
 * Files the binding under the node it currently follows.
 * @param {Binding} binding
 */
function follow(binding) {
  const node = binding.anchor();
  if (!node || node === binding.keyed) {
    return;
  }
  forget(binding);
  let set = bindings.get(node);
  if (!set) {
    set = new Set();
    bindings.set(node, set);
  }
  set.add(binding);
  binding.keyed = node;
}

/** @param {Binding} binding */
function forget(binding) {
  if (binding.keyed) {
    bindings.get(binding.keyed)?.delete(binding);
    binding.keyed = undefined;
  }
}

/** @type {import('fiorejs/type/base.dom.d.ts').Plugin} */
export const plugin = {
  name: 'fiorejs-signals',
  bind(value, apply, context) {
    const isListener = context.kind !== 'child' && /^on/i.test(context.name);
    if (!isSignal(value) && (typeof value !== 'function' || isListener)) {
      return false;
    }
    const getter = isSignal(value) ? () => value.get() : /** @type {() => unknown} */ (value);

    /** @type {Binding} */
    const binding = {
      anchor: () => (context.kind === 'child' ? context.nodes()[0] : context.element),
      start: () =>
        runIn(null, null, () =>
          effect(() => {
            apply(getter());
            follow(binding);
          }),
        ),
    };
    binding.stop = binding.start();
    // The surrounding effect or list row ends the binding for good when it reruns or is removed.
    owner?.owned.push(() => {
      forget(binding);
      binding.stop?.();
      binding.stop = undefined;
    });
    observe();
    return true;
  },
};

use(plugin);
