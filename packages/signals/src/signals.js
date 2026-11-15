import { use } from 'fiorejs';

const SIGNAL = Symbol.for('fiorejs.signal');

/** Signals inherit their brand, so a signal is not a plain object: fiorejs reads plain objects as data or as nested props. */
const signalPrototype = Object.freeze({ [SIGNAL]: true });

/**
 * @typedef {{ subs: Set<Computation>, release?(): void, missed?: boolean }} Source
 * @typedef {{ sources: Set<Source>, stale(): void }} Computation
 * @typedef {{ owned: (() => void)[] }} Owner
 */

/** @type {Computation | null} */
let current = null;
/** @type {Owner | null} */
let owner = null;
/** @type {Set<{ run(): void, stop(): void }>} */
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
  for (const sub of source.subs) {
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
  try {
    for (const effect of pending) {
      pending.delete(effect);
      const count = (runs.get(effect) ?? 0) + 1;
      runs.set(effect, count);
      if (count > MAX_RUNS) {
        // Only the looping effect stops; the others still run.
        report(new Error(`An effect ran more than ${MAX_RUNS} times in one update; it probably sets a signal it reads.`));
        effect.stop();
        continue;
      }
      effect.run();
    }
  } finally {
    flushing = false;
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
  let completed = false;
  try {
    const result = runIn(computation, nextOwner, fn);
    completed = true;
    return result;
  } finally {
    if (completed) {
      unsubscribe(
        computation,
        [...previous].filter((source) => !computation.sources.has(source)),
      );
    } else {
      // A run that threw may have stopped before reading its sources; it keeps following them, and a computed among
      // them that is still dirty passes its next change on, so the next change runs it again.
      for (const source of previous) {
        if (!computation.sources.has(source)) {
          computation.sources.add(source);
          source.missed = true;
        }
      }
    }
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
    __proto__: signalPrototype,
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
      // The value may already have changed when fn throws, so readers are notified either way.
      try {
        fn(value);
      } finally {
        notify(source);
      }
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
  /** @type {{ error: unknown } | undefined} An error from the last calculation, cached like a value. */
  let failure;
  let dirty = true;
  /** @type {Source & Computation} */
  const node = {
    subs: new Set(),
    sources: new Set(),
    stale() {
      // Already dirty means the readers heard of the change, unless one of them failed before reading it again.
      if (dirty && !node.missed) {
        return;
      }
      node.missed = false;
      dirty = true;
      for (const sub of node.subs) {
        sub.stale();
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
    __proto__: signalPrototype,
    get() {
      // The reader subscribes first, so it stays subscribed even when the calculation throws.
      track(node);
      if (dirty) {
        try {
          value = runTracked(node, null, fn);
          failure = undefined;
        } catch (error) {
          failure = { error };
        }
        dirty = false;
      }
      if (node.subs.size === 0) {
        release();
      }
      if (failure) {
        throw failure.error;
      }
      return value;
    },
  };
}

/**
 * Runs `fn` now and again whenever a signal it read changes; returns a function that stops it.
 * `fn` may return a cleanup function, called before the next run and when stopped.
 * If a run throws, the error is reported and the effect is stopped.
 * @param {() => void | (() => void)} fn
 * @returns {() => void}
 */
export function effect(fn) {
  /** @type {(() => void) | undefined} */
  let cleanup;
  let stopped = false;
  /** @type {Owner} */
  const scope = { owned: [] };
  /** @type {Computation & { run(): void, stop(): void }} */
  const node = {
    sources: new Set(),
    stale: () => pending.add(node),
    run() {
      if (stopped) {
        return;
      }
      reset();
      try {
        const result = runTracked(node, scope, fn);
        cleanup = typeof result === 'function' ? result : undefined;
      } catch (error) {
        report(error);
        stopped = true;
      }
      // Stopped by its error or during its own run: undo what the run set up.
      if (stopped) {
        stop();
      }
    },
    stop,
  };

  /**
   * Stops the effects created by the last run and calls its cleanup, keeping the subscriptions. A cleanup that
   * throws is reported and does not keep this effect from running.
   */
  function reset() {
    scope.owned.splice(0).forEach((stopOwned) => stopOwned());
    const done = cleanup;
    cleanup = undefined;
    try {
      done?.();
    } catch (error) {
      report(error);
    }
  }

  function stop() {
    stopped = true;
    pending.delete(node);
    reset();
    untrackSources(node);
  }

  owner?.owned.push(stop);
  // Writes during the first run are queued until it has finished, so the run is never re-entered and no cleanup
  // is overwritten.
  const outermost = !flushing;
  flushing = true;
  try {
    node.run();
  } finally {
    if (outermost) {
      flushing = false;
    }
  }
  if (outermost) {
    flush();
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
 * A getter for `className` or the `class` attribute that lists classes by condition: strings are always on, and the keys
 * of an object are on while their value, a boolean, signal or getter, is truthy.
 * @param {string | Record<string, unknown> | readonly (string | Record<string, unknown>)[]} entries
 * @returns {() => string}
 */
export function classList(entries) {
  const list = Array.isArray(entries) ? entries : [entries];
  return () =>
    list
      .flatMap((entry) => (typeof entry === 'string' ? [entry] : Object.keys(entry).filter((name) => read(entry[name]))))
      .join(' ');
}

/**
 * Loads a value with `fetcher`, and again whenever `source` changes, like Solid's createResource. While `source`
 * gives null, undefined or false nothing is loaded. `fetcher` gets the source value and an AbortSignal that aborts
 * when a newer load starts or the resource is stopped with its owner; the result of an older load is ignored.
 * @param {unknown} source a signal or getter, or the fetcher when there is no source
 * @param {(value: any, info: { signal: AbortSignal }) => unknown} [fetcher]
 */
export function resource(source, fetcher) {
  if (!fetcher) {
    fetcher = /** @type {(value: any, info: { signal: AbortSignal }) => unknown} */ (source);
    source = () => true;
  }
  const load = fetcher;
  const value = state(/** @type {unknown} */ (undefined));
  const loading = state(false);
  const error = state(/** @type {unknown} */ (undefined));
  /** @type {unknown} */
  let input;
  /** @type {AbortController | undefined} */
  let controller;

  function start() {
    controller?.abort();
    const own = new AbortController();
    controller = own;
    loading.set(true);
    error.set(undefined);
    // Called inside the promise, so a synchronous throw from the fetcher becomes the error too.
    new Promise((resolve) => resolve(untrack(() => load(input, { signal: own.signal })))).then(
      (result) => {
        if (controller === own) {
          value.set(result);
          loading.set(false);
        }
      },
      (reason) => {
        if (controller === own) {
          error.set(reason);
          loading.set(false);
        }
      },
    );
  }

  const active = () => input != null && input !== false;

  effect(() => {
    input = read(/** @type {import('./signals.d.ts').Reactive<unknown>} */ (source));
    if (!active()) {
      loading.set(false);
      return;
    }
    start();
    return () => {
      controller?.abort();
      controller = undefined;
    };
  });

  return {
    __proto__: signalPrototype,
    get: value.get,
    loading: { __proto__: signalPrototype, get: loading.get },
    error: { __proto__: signalPrototype, get: error.get },
    /** Loads again with the last source value. */
    refetch() {
      if (active()) {
        start();
      }
    },
    /** Sets the value without loading, for example after an optimistic change. */
    mutate: value.set,
  };
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
    [...old.values()].flat().forEach((row) => row.stop());
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
      created.forEach((row) => row.stop());
      throw error;
    }

    const kept = new Set([...next.values()].flat());
    const old = rows;
    rows = next;
    for (const row of [...old.values()].flat()) {
      if (!kept.has(row)) {
        row.stop();
      }
    }
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
  const stop = () => scope.owned.splice(0).forEach((stopOwned) => stopOwned());
  try {
    return { node: runIn(null, scope, render), stop };
  } catch (error) {
    stop();
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
  const walker = document.createTreeWalker(node, 1 | 4 | 128 /* elements, text and comments */);
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
    // Cleared first, so a stop that throws still leaves the binding ready to resume.
    const stop = binding.stop;
    binding.stop = undefined;
    stop?.();
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
