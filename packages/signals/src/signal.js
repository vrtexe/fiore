import { LIVE } from "fiorejs";
import {
  COMPUTED,
  DIRTY,
  ERROR,
  PENDING,
  RUNNING,
  checkDirty,
  current,
  link,
  owner,
  propagate,
  release,
  runTracked,
  stopOwned,
} from "./tracking.js";
import { List, itemKey } from "./list.js";
import { When } from "./when.js";
import { attach } from "./dom.js";

/** @typedef {import('./tracking.js').Edge} Edge */

export const SIGNAL = Symbol.for("fiorejs.signal");

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
    throw new TypeError("get() is implemented by State, Computed and Resource");
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
    return {
      /**
       * Renders the list and reuses the rows of items whose key it has seen.
       * @param {(item: U, index: number) => Node} render
       */
      map: (render) => new List(this, render, key),
    };
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
  if (current !== null && current.flags & COMPUTED) {
    throw new Error("A computed cannot set a signal; derive the value, or set it in an effect or an event handler.");
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
    this.flags = 0;
    /** @type {Edge | undefined} */
    this.subs = undefined;
    /** @type {Edge | undefined} */
    this.subsTail = undefined;
    /** Counts changes, so a reader can tell whether this signal changed since it last read it. */
    this.version = 0;
    this._value = value;
  }

  get() {
    if (current !== null) {
      link(this, current).version = this.version;
    }
    return this._value;
  }

  /** @param {T} next */
  set(next) {
    forbidInComputed();
    if (!Object.is(next, this._value)) {
      this._value = next;
      this.version++;
      if (this.subs !== undefined) {
        propagate(this.subs);
      }
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
      if (this.subs !== undefined) {
        propagate(this.subs);
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
  return new State(value);
}

/**
 * A cached value derived from other signals; recalculated on read after an input changed. The instance is its own
 * source, reader and owner: bindings and effects created by a run stop before the next run and when it loses its
 * readers. It has the fields of an effect in the same order, so the graph walks see one shape.
 * @template T
 * @extends {Signal<T>}
 */
export class Computed extends Signal {
  /** @param {() => T} fn */
  constructor(fn) {
    super();
    this.flags = COMPUTED | DIRTY;
    /** @type {Edge | undefined} */
    this.deps = undefined;
    /** @type {Edge | undefined} */
    this.depsTail = undefined;
    /** @type {Edge | undefined} */
    this.subs = undefined;
    /** @type {Edge | undefined} */
    this.subsTail = undefined;
    /** Counts recalculations that gave a different value or error, so readers can skip a run when nothing changed. */
    this.version = 0;
    /** @type {(() => void)[] | undefined} */
    this.owned = undefined;
    this._fn = fn;
    /** @type {unknown} The last result, an error when ERROR is set; kept to compare with the next one. */
    this._value = undefined;
    this.id = 0;
    /** @type {0 | 1 | 2} */
    this.phase = 1;
    this.queued = false;
    this.flush = 0;
    this.runs = 0;
  }

  /** @returns {T} */
  get() {
    // The reader subscribes first, so it stays subscribed even when the calculation throws.
    const edge = current !== null ? link(this, current) : undefined;
    const flags = this.flags;
    // Dirty without sources means it never ran or let go of its sources; otherwise the check updates them first.
    if (flags & (DIRTY | PENDING)) {
      if ((flags & DIRTY && this.deps === undefined) || checkDirty(this) || this.flags & DIRTY) {
        this._update();
      } else {
        this.flags &= ~PENDING;
      }
    }
    if (this.subs === undefined) {
      release(this);
    }
    // The reader remembers the version it read, so it can skip a run when this value did not change.
    if (edge !== undefined) {
      edge.version = this.version;
    }
    if (this.flags & ERROR) {
      throw this._value;
    }
    return /** @type {T} */ (this._value);
  }

  /** Calculates the value again; an error is kept as the result. */
  _update() {
    stopOwned(this);
    this.flags = (this.flags & ~(DIRTY | PENDING)) | RUNNING;
    /** @type {unknown} */
    let value;
    let failed = false;
    try {
      // Without a reader the computed releases right after this read, so what the run creates belongs to the caller.
      value = runTracked(this, this.subs !== undefined ? this : owner, this._fn);
    } catch (error) {
      stopOwned(this);
      value = error;
      failed = true;
    }
    const flags = this.flags & ~RUNNING;
    if (this.version === 0 || !Object.is(value, this._value) || failed !== ((flags & ERROR) !== 0)) {
      this.version++;
    }
    this._value = value;
    // An input changed during the run: the readers were told, and the computed stays dirty, so the next read runs again.
    this.flags = failed ? flags | ERROR : flags & ~ERROR;
  }
}

/**
 * A cached value derived from other signals; recalculated on read after an input changed.
 * @template T
 * @param {() => T} fn
 */
export function computed(fn) {
  return new Computed(fn);
}
