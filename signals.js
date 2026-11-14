import { use } from 'fiorejs';

const SIGNAL = Symbol.for('fiorejs.signal');

/**
 * @typedef {{ subs: Set<Computation> }} Source
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
  try {
    for (const effect of pending) {
      pending.delete(effect);
      effect.run();
    }
  } finally {
    flushing = false;
  }
}

/** @param {Computation} computation */
function untrackSources(computation) {
  for (const source of computation.sources) {
    source.subs.delete(computation);
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
  return {
    [SIGNAL]: true,
    get() {
      track(source);
      return value;
    },
    /** @param {T} next */
    set(next) {
      if (!Object.is(next, value)) {
        value = next;
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
  };
  return {
    [SIGNAL]: true,
    get() {
      if (dirty) {
        untrackSources(node);
        value = runIn(node, null, fn);
        dirty = false;
      }
      track(node);
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
 * Renders a list and reuses the nodes of items whose key is unchanged.
 * @template T
 * @param {import('./signals.d.ts').Reactive<readonly T[]>} items
 * @param {(item: T, index: number) => Node} render
 * @param {(item: T) => unknown} [key]
 */
export function each(items, render, key = (item) => item) {
  /** @type {Map<unknown, { node: Node, stop: () => void }>} */
  let rows = new Map();

  return () => {
    /** @type {typeof rows} */
    const next = new Map();
    const nodes = read(items).map((item, index) => {
      const id = key(item);
      let row = rows.get(id);
      if (!row) {
        /** @type {Owner} */
        const scope = { owned: [] };
        const node = runIn(null, scope, () => render(item, index));
        row = { node, stop: () => scope.owned.splice(0).forEach((stop) => stop()) };
      }
      next.set(id, row);
      return row.node;
    });

    for (const [id, row] of rows) {
      if (!next.has(id)) {
        row.stop();
      }
    }
    rows = next;
    return nodes;
  };
}

/** @type {Map<Element, { seen: boolean, stops: (() => void)[] }>} */
const bound = new Map();
/** @type {MutationObserver | undefined} */
let observer;

function sweep() {
  for (const [element, entry] of bound) {
    if (element.isConnected) {
      entry.seen = true;
    } else if (entry.seen) {
      entry.stops.forEach((stop) => stop());
      bound.delete(element);
    }
  }
  if (bound.size === 0) {
    observer?.disconnect();
    observer = undefined;
  }
}

/**
 * Stops the bindings of an element once it has been in the document and is removed.
 * @param {Element} element
 * @param {() => void} stop
 */
function trackRemoval(element, stop) {
  const entry = bound.get(element) ?? { seen: element.isConnected, stops: [] };
  entry.stops.push(stop);
  bound.set(element, entry);
  if (!observer) {
    observer = new MutationObserver(sweep);
    observer.observe(document, { childList: true, subtree: true });
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
    trackRemoval(context.element, effect(() => apply(getter())));
    return true;
  },
};

use(plugin);
