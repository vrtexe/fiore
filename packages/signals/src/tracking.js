import { enqueue, enterRun, exitRun, fail } from './scheduler.js';

/** @typedef {import('./scheduler.js').Queued} Queued */

/**
 * @template T
 * @typedef {import('./signal.js').Computed<T>} Computed
 */

/**
 * @typedef {{ subs: Set<Computation>, version: number, release?(): void, missed?: boolean }} Source
 * @typedef {{ sources: Set<Source>, stale(maybe?: boolean): void, saw?(source: Computed<unknown>): void }} Computation
 * @typedef {{ owned: (() => void)[], done?: boolean }} Owner
 */

/** @type {Computation | null} */
export let current = null;

/** @type {Owner | null} */
export let owner = null;

/** Numbers effects in creation order, so a parent runs before the effects it created. */
let nextId = 0;

/** @param {Source} source */
export function track(source) {
  if (current) {
    source.subs.add(current);
    current.sources.add(source);
  }
}

/** @param {Source} source */
export function notify(source) {
  for (const sub of source.subs) {
    sub.stale(false);
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
export function untrackSources(computation) {
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
export function runIn(computation, nextOwner, fn) {
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
export function runTracked(computation, nextOwner, fn) {
  const previous = computation.sources;
  computation.sources = new Set();
  /** @type {T} */
  let result;
  try {
    result = runIn(computation, nextOwner, fn);
  } catch (error) {
    // A run that threw may have stopped before reading its sources; it keeps following them, and a computed among
    // them that is still dirty passes its next change on, so the next change runs it again.
    for (const source of previous) {
      if (!computation.sources.has(source)) {
        computation.sources.add(source);
        source.missed = true;
      }
    }
    throw error;
  }
  unsubscribe(
    computation,
    [...previous].filter((source) => !computation.sources.has(source)),
  );
  return result;
}

/**
 * Stops what an owner created, in the order it was created, and empties the owner.
 * @param {Owner} scope
 */
export function stopOwned(scope) {
  for (const stop of scope.owned.splice(0)) {
    stop();
  }
}

/**
 * Runs `fn` with a new owner, outside any tracking, and returns its value with the function that stops what it
 * created. If `fn` throws, what it created is stopped.
 * @template T
 * @param {() => T} fn
 * @returns {{ value: T, stop: () => void }}
 */
export function own(fn) {
  /** @type {Owner} */
  const scope = { owned: [] };
  const stop = () => {
    scope.done = true;
    stopOwned(scope);
  };
  try {
    return { value: runIn(null, scope, fn), stop };
  } catch (error) {
    stop();
    throw error;
  }
}

/**
 * Runs `fn` now and again in the next flush after a signal it read changed; returns a function that stops it.
 * `fn` may return a cleanup function, called before the next run and when stopped.
 * If a run throws, the effect is stopped and the error is thrown at the end of the flush.
 * @param {() => void | (() => void)} fn
 * @returns {() => void}
 */
export function effect(fn) {
  return createEffect(fn, 1);
}

/**
 * Like `effect`, but its runs come before the effects and bindings of a flush.
 * @param {() => void | (() => void)} fn
 * @returns {() => void}
 */
effect.pre = (fn) => createEffect(fn, 0);

/**
 * Like `effect`, but its runs come after the effects and bindings of a flush, and its first run waits for the next
 * flush, so the elements built with it are in the document by then.
 * @param {() => void | (() => void)} fn
 * @returns {() => void}
 */
effect.post = (fn) => createEffect(fn, 2);

/**
 * @param {() => void | (() => void)} fn
 * @param {0 | 1 | 2} phase
 * @returns {() => void}
 */
function createEffect(fn, phase) {
  /** @type {(() => void) | undefined} */
  let cleanup;
  let stopped = false;
  /** @type {Owner} */
  const scope = { owned: [] };
  /** @type {Computation & Queued & { dirty: boolean, seen: Computed<unknown>[] | undefined, versions: number[] | undefined, count: number }} */
  const node = {
    id: nextId++,
    queued: false,
    flush: 0,
    runs: 0,
    sources: new Set(),
    /** True when a signal it read changed for certain, false when only computeds said they may have changed. */
    dirty: false,
    /** The computeds the last run read and their versions then; created on the first computed read, reused after. */
    seen: undefined,
    versions: undefined,
    count: 0,
    saw(source) {
      const i = node.count++;
      (node.seen ??= [])[i] = source;
      (node.versions ??= [])[i] = source.version;
    },
    stale: (maybe) => {
      if (!maybe) {
        node.dirty = true;
      }
      enqueue(node, phase);
    },
    run() {
      if (stopped) {
        return;
      }
      // Only computeds may have changed: run again only if one of them recalculated to a different value.
      if (!node.dirty && node.seen && node.versions && node.count > 0 && unchanged(node.seen, node.versions, node.count)) {
        return;
      }
      node.dirty = false;
      node.count = 0;
      reset();
      enterRun();
      try {
        const result = runTracked(node, scope, fn);
        cleanup = typeof result === 'function' ? result : undefined;
      } catch (error) {
        fail(error);
        stopped = true;
      } finally {
        exitRun();
      }
      // Stopped by its error or during its own run: undo what the run set up.
      if (stopped) {
        stop();
        return;
      }
      if (node.seen && node.versions) {
        node.seen.length = node.count;
        node.versions.length = node.count;
      }
    },
    stop,
  };

  /**
   * Stops the effects created by the last run and calls its cleanup, keeping the subscriptions. A cleanup that
   * throws does not keep this effect from running; its error is thrown like an error of the run.
   */
  function reset() {
    stopOwned(scope);
    const done = cleanup;
    cleanup = undefined;
    try {
      done?.();
    } catch (error) {
      fail(error);
    }
  }

  function stop() {
    stopped = true;
    scope.done = true;
    node.queued = false;
    reset();
    untrackSources(node);
    node.seen = undefined;
    node.versions = undefined;
    node.count = 0;
  }

  owner?.owned.push(stop);
  if (phase === 2) {
    node.dirty = true;
    enqueue(node, phase);
  } else {
    node.run();
  }
  return stop;
}

/**
 * Runs `fn` with a new owner and returns a function that stops what `fn` created: effects, bindings, computeds and
 * lists. Reads in `fn` do not subscribe. A root belongs to no other owner, also when it is created inside one, so it
 * lives until its function is called. If `fn` throws, what it created is stopped.
 * @param {() => void} fn
 * @returns {() => void}
 */
export function root(fn) {
  return own(fn).stop;
}

/**
 * Whether none of the computeds changed since their versions were recorded; each is brought up to date first.
 * @param {Computed<unknown>[]} seen
 * @param {number[]} versions
 * @param {number} count
 */
function unchanged(seen, versions, count) {
  // Reads without a running computation or owner, like untrack, without allocating a closure per check.
  const previous = current;
  const previousOwner = owner;
  current = null;
  owner = null;
  try {
    for (let i = 0; i < count; i++) {
      const source = /** @type {Computed<unknown>} */ (seen[i]);
      try {
        source.get();
      } catch {
        // An error is a result of the computed like a value; its version says whether it changed.
      }
      if (source.version !== versions[i]) {
        return false;
      }
    }
    return true;
  } finally {
    current = previous;
    owner = previousOwner;
  }
}

/**
 * Runs `fn` without subscribing to the signals it reads. What it creates belongs to the current owner, as it would
 * outside `untrack`.
 * @template T
 * @param {() => T} fn
 * @returns {T}
 */
export function untrack(fn) {
  return runIn(null, owner, fn);
}

/**
 * The owner that the running code belongs to, or null; give it to `runWithOwner` to create effects and bindings
 * under it later, in an event handler, a timer or after an `await`.
 * @returns {Owner | null}
 */
export function getOwner() {
  return owner;
}

/**
 * Runs `fn` under `scope`, outside any tracking, so what it creates stops with that owner. When the owner has already
 * stopped, what `fn` created is stopped as soon as `fn` returns.
 * @template T
 * @param {Owner | null} scope
 * @param {() => T} fn
 * @returns {T}
 */
export function runWithOwner(scope, fn) {
  if (!scope?.done) {
    return runIn(null, scope, fn);
  }
  const { value, stop } = own(fn);
  stop();
  return value;
}
