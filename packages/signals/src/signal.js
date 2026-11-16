import { LIVE } from 'fiorejs';
import { current, notify, owner, runTracked, track, untrackSources } from './tracking.js';
import { Keyed, List, itemKey } from './list.js';
import { When } from './when.js';
import { attach } from './dom.js';

/** @typedef {import('./tracking.js').Source} Source */
/** @typedef {import('./tracking.js').Computation} Computation */

export const SIGNAL = Symbol.for('fiorejs.signal');

/**
 * The base of every signal. Signals inherit their brand, so a signal is not a plain object: fiorejs reads plain objects
 * as data or as nested props.
 * @template T
 */
export class Signal {
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
export class Computed extends Signal {
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
