import { LIVE } from 'fiorejs';

const SIGNAL = Symbol.for('fiorejs.signal');

/**
 * The base of every signal. Signals inherit their brand, so a signal is not a plain object: fiorejs reads plain objects
 * as data or as nested props.
 * @template T
 */
class Signal {
  /** @returns {true} */
  get [SIGNAL]() {
    return true;
  }

  /** @returns {T} */
  get() {
    throw new TypeError('get() is implemented by State, Computed and Resource');
  }

  /**
   * Binds the signal to a property, an attribute or a child of an element.
   * @param {(value: unknown) => void} apply
   * @param {import('fiorejs/type/base.dom.d.ts').BindContext} context
   */
  [LIVE](apply, context) {
    attach(() => this.get(), apply, context);
  }

  /**
   * A computed value derived from this signal's value.
   * @template U
   * @param {(value: T) => U} fn
   */
  computed(fn) {
    return computed(() => fn(this.get()));
  }

  /**
   * Passes the signal to `fn` and returns its result, for reusable steps.
   * @template R
   * @param {(signal: this) => R} fn
   * @returns {R}
   */
  with(fn) {
    return fn(this);
  }

  /**
   * Renders a list and reuses the rows of items it has seen; the item itself is the key.
   * @template U
   * @this {Signal<readonly U[]>}
   * @param {(item: U, index: number) => Node} render
   */
  map(render) {
    return new List(this, render, (item) => item);
  }

  /**
   * Keys the rows of a list by `item.key`, or by what `key` returns.
   * @template U
   * @this {Signal<readonly U[]>}
   * @param {(item: U) => unknown} [key]
   */
  for(key = itemKey) {
    return new Keyed(this, key);
  }

  /**
   * Shows what `then` returns while the signal's value is truthy, and nothing otherwise; add `.else(fn)` for the other
   * case. Only the shown branch is built.
   * @template A
   * @param {() => A} then
   * @returns {When<A, null>}
   */
  if(then) {
    return new When(this, [[Boolean, then]], () => null);
  }

  /**
   * Shows what `render` returns while the signal's value matches `match`, and nothing otherwise. A function is a test
   * on the value; any other value is compared with `Object.is`. Add more cases with `.case` and the rest with
   * `.else(fn)`; the first case that matches wins.
   * @template A
   * @param {unknown} match
   * @param {() => A} render
   * @returns {When<A, null>}
   */
  case(match, render) {
    return new When(this, [[match, render]], () => null);
  }
}

/**
 * @typedef {{ subs: Set<Computation>, version: number, release?(): void, missed?: boolean }} Source
 * @typedef {{ sources: Set<Source>, stale(maybe?: boolean): void, saw?(source: Computed<unknown>): void }} Computation
 * @typedef {{ owned: (() => void)[] }} Owner
 */

/** @type {Computation | null} */
let current = null;
/** @type {Owner | null} */
let owner = null;
/**
 * An effect as the flush sees it: `queued` while it waits, and how often it ran in the flush numbered `flush`.
 * @typedef {{ id: number, queued: boolean, flush: number, runs: number, run(): void, stop(): void }} Queued
 */

/** @type {[Queued[], Queued[], Queued[]]} Effects waiting for the flush, by phase: pre, normal, post. */
const queues = [[], [], []];
/** Whether an effect joined a queue out of creation order, so the queue is sorted before it runs. */
const unsorted = [false, false, false];
/** True while work waits for the flush. */
let scheduled = false;
/** True while the microtask that flushes is queued; a flush() before it runs leaves it nothing to do. */
let task = false;
let flushing = false;
/** Numbers flushes, so an effect can count its runs per flush. */
let flushes = 0;
/** @type {{ error: unknown } | undefined} The first error of the running flush. */
let failure;
/** @type {{ resolve(): void, reject(error: unknown): void }[]} The tick() promises waiting for the flush. */
let waiters = [];
/** Numbers effects in creation order, so a parent runs before the effects it created. */
let nextId = 0;

/** How often one effect may run in a single flush before it counts as a loop. */
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
    sub.stale(false);
  }
}

/**
 * Queues an effect for the flush once, and the flush on a microtask unless it is queued or running; a running flush
 * takes new work itself.
 * @param {Queued} node
 * @param {0 | 1 | 2} phase
 */
function enqueue(node, phase) {
  if (node.queued) {
    return;
  }
  node.queued = true;
  const queue = queues[phase];
  const last = queue[queue.length - 1];
  if (last && last.id > node.id) {
    unsorted[phase] = true;
  }
  queue.push(node);
  if (scheduled || flushing) {
    return;
  }
  scheduled = true;
  if (!task) {
    task = true;
    queueMicrotask(() => {
      task = false;
      if (scheduled) {
        settle(true);
      }
    });
  }
}

/**
 * Runs the effects and bindings that are waiting now, instead of on the next microtask, for example before reading
 * the DOM after a change. Inside a running flush it does nothing, because that flush runs them before it ends.
 */
export function flush() {
  if (!flushing) {
    settle(false);
  }
}

/**
 * Returns a promise that resolves after the waiting effects and bindings have run, or right away when none wait. It
 * rejects with the first error of that flush.
 * @returns {Promise<void>}
 */
export function tick() {
  return new Promise((resolve, reject) => {
    if (scheduled || flushing) {
      waiters.push({ resolve, reject });
    } else {
      resolve();
    }
  });
}

/**
 * Runs queued effects until none is left: the pre phase, then effects and bindings, then the post phase, each in
 * creation order. A write during the flush queues more work, and the flush goes back to the first phase that has
 * some. Every effect runs even when another throws; the first error is thrown at the end.
 * @param {boolean} queued whether the flush runs from its microtask, where a waiting tick() takes the error
 */
function settle(queued) {
  scheduled = false;
  flushing = true;
  const flush = ++flushes;
  try {
    for (;;) {
      const phase = firstPhase();
      if (phase === -1) {
        break;
      }
      // Work queued while this batch runs goes to a new queue, for the next round.
      const batch = queues[phase];
      queues[phase] = [];
      if (unsorted[phase]) {
        unsorted[phase] = false;
        batch.sort((a, b) => a.id - b.id);
      }
      for (const node of batch) {
        // An effect stopped since it was queued is skipped.
        if (!node.queued) {
          continue;
        }
        node.queued = false;
        if (node.flush !== flush) {
          node.flush = flush;
          node.runs = 0;
        }
        if (++node.runs > MAX_RUNS) {
          // Only the looping effect stops; the others still run.
          fail(new Error(`An effect ran more than ${MAX_RUNS} times in one flush; it probably sets a signal it reads.`));
          node.stop();
          continue;
        }
        node.run();
      }
    }
  } finally {
    flushing = false;
  }
  const result = failure;
  failure = undefined;
  const waiting = waiters;
  waiters = [];
  for (const waiter of waiting) {
    if (result) {
      waiter.reject(result.error);
    } else {
      waiter.resolve();
    }
  }
  if (result && !(queued && waiting.length > 0)) {
    throw result.error;
  }
}

/**
 * The first phase with queued effects, or -1.
 * @returns {0 | 1 | 2 | -1}
 */
function firstPhase() {
  return queues[0].length > 0 ? 0 : queues[1].length > 0 ? 1 : queues[2].length > 0 ? 2 : -1;
}

/**
 * Keeps the first error of the running flush, to throw at its end; later errors and errors outside a flush are
 * reported, so none is lost.
 * @param {unknown} error
 */
function fail(error) {
  if (flushing && !failure) {
    failure = { error };
  } else {
    report(error);
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

/** A computed derives a value; a write from its run would loop through its own inputs, so it throws instead. */
function forbidInComputed() {
  if (current instanceof Computed) {
    throw new Error('A computed cannot set a signal; derive the value, or set it in an effect or an event handler.');
  }
}

/**
 * A value that can be read and written; reading it inside an effect or computed subscribes. The instance is its own
 * source.
 * @template T
 * @extends {Signal<T>}
 */
class State extends Signal {
  /** @param {T} value */
  constructor(value) {
    super();
    this._value = value;
    /** @type {Set<Computation>} */
    this.subs = new Set();
    /** Counts changes, so a reader can tell whether this signal changed since it last read it. */
    this.version = 0;
  }

  get() {
    track(this);
    return this._value;
  }

  /** @param {T} next */
  set(next) {
    forbidInComputed();
    if (!Object.is(next, this._value)) {
      this._value = next;
      this.version++;
      notify(this);
    }
  }

  /**
   * Sets the value that `fn` returns for the current value, for example `(count) => count + 1`.
   * @param {(value: T) => T} fn
   */
  update(fn) {
    this.set(fn(this._value));
  }

  /**
   * Changes the value in place, for example with `list.push(item)`, and always notifies.
   * @param {(value: T) => unknown} fn
   */
  mutate(fn) {
    forbidInComputed();
    // The value may already have changed when fn throws, so readers are notified either way.
    try {
      fn(this._value);
    } finally {
      this.version++;
      notify(this);
    }
  }
}

/**
 * A value that can be read and written; reading it inside an effect or computed subscribes.
 * @template T
 * @param {T} value
 */
export function state(value) {
  return new State(value);
}

/**
 * A cached value derived from other signals; recalculated on read after an input changed. The instance is its own
 * source, computation and owner: bindings and effects created by a run stop before the next run and when it loses its
 * readers. No cached result means it is dirty.
 * @template T
 * @extends {Signal<T>}
 */
class Computed extends Signal {
  /** @param {() => T} fn */
  constructor(fn) {
    super();
    this._fn = fn;
    /** @type {{ value: T } | { error: unknown } | undefined} The last result, an error cached like a value. */
    this._result = undefined;
    /** @type {Set<Computation>} */
    this.subs = new Set();
    /** @type {Set<Source>} */
    this.sources = new Set();
    this.missed = false;
    /** @type {(() => void)[]} */
    this.owned = [];
    /** True while the computed runs, so a change during its own run still reaches its readers. */
    this._running = false;
    /** Set when an input changes during the current run, so that run is not cached. */
    this._changed = false;
    /** Counts recalculations that gave a different value or error, so readers can skip a run when nothing changed. */
    this.version = 0;
    /** @type {{ value: T } | { error: unknown } | undefined} The last result, kept to compare with the next one. */
    this._previous = undefined;
  }

  stale() {
    // Already dirty means the readers heard of the change, unless one of them failed before reading it again, or the
    // change came during this computed's own run.
    if (!this._result && !this.missed && !this._running) {
      return;
    }
    this.missed = false;
    this._result = undefined;
    this._changed = this._running;
    // The readers only learn that this value may have changed; they check its version before they run again.
    for (const sub of this.subs) {
      sub.stale(true);
    }
  }

  /** Without readers a computed lets go of its sources, so it can be collected and is not visited on every set. */
  release() {
    untrackSources(this);
    this._result = undefined;
    this.owned.splice(0).forEach((stopOwned) => stopOwned());
  }

  get() {
    // The reader subscribes first, so it stays subscribed even when the calculation throws.
    track(this);
    let result = this._result;
    if (!result) {
      this.owned.splice(0).forEach((stopOwned) => stopOwned());
      this._running = true;
      this._changed = false;
      try {
        // Without a reader the computed releases right after this read, so what the run creates belongs to the caller.
        result = { value: runTracked(this, this.subs.size > 0 ? this : owner, this._fn) };
      } catch (error) {
        this.owned.splice(0).forEach((stopOwned) => stopOwned());
        result = { error };
      } finally {
        this._running = false;
      }
      if (!sameResult(this._previous, result)) {
        this.version++;
      }
      this._previous = result;
      // An input changed during the run: the readers were told, so the next read runs again instead of using this.
      if (!this._changed) {
        this._result = result;
      }
    }
    if (this.subs.size === 0) {
      this.release();
    }
    // An effect remembers the version it read, so it can skip a later run if this value did not change.
    current?.saw?.(this);
    if ('error' in result) {
      throw result.error;
    }
    return result.value;
  }
}

/**
 * Whether two results of a computed are the same value (Object.is) or the same error.
 * @param {{ value: unknown } | { error: unknown } | undefined} previous
 * @param {{ value: unknown } | { error: unknown }} next
 */
function sameResult(previous, next) {
  if (!previous) {
    return false;
  }
  return 'value' in previous ? 'value' in next && Object.is(previous.value, next.value) : 'error' in next && Object.is(previous.error, next.error);
}

/**
 * A cached value derived from other signals; recalculated on read after an input changed.
 * @template T
 * @param {() => T} fn
 */
export function computed(fn) {
  return new Computed(fn);
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
      try {
        const result = runTracked(node, scope, fn);
        cleanup = typeof result === 'function' ? result : undefined;
      } catch (error) {
        fail(error);
        stopped = true;
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
    scope.owned.splice(0).forEach((stopOwned) => stopOwned());
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
  /** @type {Owner} */
  const scope = { owned: [] };
  const dispose = () => scope.owned.splice(0).forEach((stop) => stop());
  try {
    runIn(null, scope, fn);
  } catch (error) {
    dispose();
    throw error;
  }
  return dispose;
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
 * A computed value for `className` or the `class` attribute that lists classes by condition: strings are always on, and
 * the keys of an object are on while their value, a boolean, signal or getter, is truthy.
 * @param {string | Record<string, unknown> | readonly (string | Record<string, unknown>)[]} entries
 */
export function classList(entries) {
  const list = Array.isArray(entries) ? entries : [entries];
  return computed(() =>
    list
      .flatMap((entry) => (typeof entry === 'string' ? [entry] : Object.keys(entry).filter((name) => read(entry[name]))))
      .join(' '),
  );
}

/**
 * A value loaded by a fetcher, with `loading` and `error` signals.
 * @extends {Signal<unknown>}
 */
class Resource extends Signal {
  /** @param {(value: unknown, info: { signal: AbortSignal }) => unknown} load */
  constructor(load) {
    super();
    this._load = load;
    this._value = state(/** @type {unknown} */ (undefined));
    this.loading = state(false);
    this.error = state(/** @type {unknown} */ (undefined));
    /** @type {unknown} The last source value. */
    this._input = undefined;
    /** @type {AbortController | undefined} */
    this._controller = undefined;
  }

  get() {
    return this._value.get();
  }

  /** Loads again with the last source value. */
  refetch() {
    if (this._active()) {
      this._start();
    }
  }

  /**
   * Sets the value without loading, for example after an optimistic change.
   * @param {unknown} value
   */
  mutate(value) {
    this._value.set(value);
  }

  _active() {
    return this._input != null && this._input !== false;
  }

  _start() {
    this._controller?.abort();
    const own = new AbortController();
    this._controller = own;
    this.loading.set(true);
    this.error.set(undefined);
    const input = this._input;
    // Called inside the promise, so a synchronous throw from the fetcher becomes the error too.
    new Promise((resolve) => resolve(untrack(() => this._load(input, { signal: own.signal })))).then(
      (result) => {
        if (this._controller === own) {
          this._value.set(result);
          this.loading.set(false);
        }
      },
      (reason) => {
        if (this._controller === own) {
          this.error.set(reason);
          this.loading.set(false);
        }
      },
    );
  }
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
  const result = new Resource(fetcher);
  effect(() => {
    result._input = read(/** @type {import('./signals.d.ts').Reactive<unknown>} */ (source));
    if (!result._active()) {
      result.loading.set(false);
      return;
    }
    result._start();
    return () => {
      result._controller?.abort();
      result._controller = undefined;
    };
  });
  return result;
}

/**
 * @typedef {{ first: Node | null, last: Node | null, stop: () => void, pass: number }} Row
 */

/**
 * The default list key: the item's `key` field.
 * @param {unknown} item
 */
function itemKey(item) {
  return typeof item === 'object' && item !== null && 'key' in item ? item.key : undefined;
}

/**
 * A signal of a list with its key, waiting for `map`.
 * @template T
 */
class Keyed {
  /**
   * @param {Signal<readonly T[]>} source
   * @param {(item: T) => unknown} key
   */
  constructor(source, key) {
    this._source = source;
    this._key = key;
  }

  /**
   * Renders the list and reuses the rows of items whose key it has seen.
   * @param {(item: T, index: number) => Node} render
   */
  map(render) {
    return new List(this._source, render, this._key);
  }
}

/**
 * A live list: every binding keeps its own rows by key and only renders new items. `index` is the item's index when its
 * row was created; a reused row keeps it.
 * @template T
 */
class List {
  /**
   * @param {Signal<readonly T[]>} source
   * @param {(item: T, index: number) => Node} render
   * @param {(item: T) => unknown} key
   */
  constructor(source, render, key) {
    this._source = source;
    this._render = render;
    this._key = key;
  }

  /**
   * @param {(value: unknown) => void} apply
   * @param {import('fiorejs/type/base.dom.d.ts').BindContext} context
   */
  [LIVE](apply, context) {
    /** @type {Map<unknown, Row[]>} Rows by key; a repeated key keeps one row per occurrence. */
    let rows = new Map();

    /** Counts the passes; a row marked with the current pass is shown, so a repeated key takes the next row. */
    let pass = 0;

    owner?.owned.push(() => {
      const old = rows;
      rows = new Map();
      for (const list of old.values()) {
        for (const row of list) {
          row.stop();
        }
      }
    });

    attach(
      () => {
        pass++;
        /** @type {Map<unknown, Row[]>} */
        const next = new Map();
        /** @type {Row[]} */
        const created = [];
        /** @type {Node[]} */
        const nodes = [];
        try {
          this._source.get().forEach((item, index) => {
            const id = this._key(item);
            let row = rows.get(id)?.find((candidate) => candidate.pass !== pass);
            if (!row) {
              row = createRow(() => this._render(item, index));
              created.push(row);
            }
            row.pass = pass;
            const list = next.get(id);
            if (list) {
              list.push(row);
            } else {
              next.set(id, [row]);
            }
            for (let node = row.first; node; node = node === row.last ? null : node.nextSibling) {
              nodes.push(node);
            }
          });
        } catch (error) {
          // The old rows stay as they were; only the rows made in this failed pass are stopped.
          created.forEach((row) => row.stop());
          throw error;
        }

        const old = rows;
        rows = next;
        for (const list of old.values()) {
          for (const row of list) {
            if (row.pass !== pass) {
              row.stop();
            }
          }
        }
        return nodes;
      },
      apply,
      context,
    );
  }
}

/**
 * A live value that shows the branch of the first case the signal's value matches, or the other branch when none does.
 * A branch is built once when it is shown, outside the binding's tracking, so it is rebuilt only when another case
 * wins; what it builds stops then.
 * @template A, B
 */
class When {
  /**
   * @param {Signal<unknown>} source
   * @param {[unknown, () => A][]} cases
   * @param {() => B} otherwise
   */
  constructor(source, cases, otherwise) {
    this._source = source;
    this._cases = cases;
    this._otherwise = otherwise;
  }

  /**
   * Adds a case, tried after the earlier ones.
   * @template C
   * @param {unknown} match
   * @param {() => C} render
   * @returns {When<A | C, B>}
   */
  case(match, render) {
    /** @type {[unknown, () => A | C][]} */
    const cases = [...this._cases, [match, render]];
    return new When(this._source, cases, this._otherwise);
  }

  /**
   * Shows what `otherwise` returns while no case matches.
   * @template C
   * @param {() => C} otherwise
   * @returns {When<A, C>}
   */
  else(otherwise) {
    return new When(this._source, this._cases, otherwise);
  }

  /**
   * @param {(value: unknown) => void} apply
   * @param {import('fiorejs/type/base.dom.d.ts').BindContext} context
   */
  [LIVE](apply, context) {
    /** @type {number | undefined} The index of the shown case, -1 for the other branch. */
    let shown;
    /** @type {A | B | undefined} */
    let value;
    /** @type {Owner} */
    let scope = { owned: [] };
    const stopBranch = () => scope.owned.splice(0).forEach((stopOwned) => stopOwned());
    owner?.owned.push(stopBranch);

    attach(
      () => {
        const current = this._source.get();
        const index = this._cases.findIndex(([match]) =>
          typeof match === 'function' ? match(current) : Object.is(match, current),
        );
        if (index !== shown) {
          stopBranch();
          shown = index;
          scope = { owned: [] };
          const branch = this._cases[index];
          value = branch ? runIn(null, scope, branch[1]) : runIn(null, scope, this._otherwise);
        }
        return value;
      },
      apply,
      context,
    );
  }
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
    const node = runIn(null, scope, render);
    // A fragment empties when it is inserted, so the row keeps its first and last node; a live child between them can
    // change the nodes in between.
    const fragment = node.nodeType === Node.DOCUMENT_FRAGMENT_NODE;
    return { first: fragment ? node.firstChild : node, last: fragment ? node.lastChild : node, stop, pass: 0 };
  } catch (error) {
    stop();
    throw error;
  }
}

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
function attach(read, apply, context) {
  /** @type {Binding} */
  const binding = {
    anchor: context.kind === 'child' ? context.anchor : context.element,
    start: () => runIn(null, null, () => effect(() => apply(read()))),
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
