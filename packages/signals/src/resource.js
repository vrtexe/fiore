import { Signal, state } from './signal.js';
import { effect, untrack } from './tracking.js';
import { read } from './utils.js';
import { report } from './scheduler.js';

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
          // A failed load that nothing reads would otherwise go unnoticed.
          if (this.error.subs.size === 0) {
            report(reason);
          }
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
      result.error.set(undefined);
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
