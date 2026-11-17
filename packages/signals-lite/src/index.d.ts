import type { LiveValue } from 'fiorejs/type/base.dom.d.ts';

/** A value that can be read; reading it inside an effect, computed or binding subscribes. */
export interface Readable<T> extends LiveValue<T> {
  get(): T;
}

/** A value that can be read and written. */
export interface State<T> extends Readable<T> {
  set(value: T): void;
}

export function state<T>(value: T): State<T>;

/** A cached value derived from other signals; `fn` gets the previous value. */
export function computed<T>(fn: (previous: T | undefined) => T): Readable<T>;

/** Runs `fn` now and in the flush after a signal it read changed; returns a function that stops it. */
export function effect(fn: () => void | (() => void)): () => void;

/** Runs `fn` with a new owner; returns a function that stops what it created. */
export function root(fn: () => void): () => void;

/** Runs `fn` without subscribing to what it reads. */
export function untrack<T>(fn: () => T): T;

/** Runs the waiting effects and bindings now instead of on the next microtask. */
export function flush(): void;

/** `select(key)` is `yes` while `source` equals `key`, and `no` otherwise; a change writes only two keys. */
export function selector<K, Y = true, N = false>(
  source: Readable<K>,
  yes?: Y,
  no?: N,
): (key: K) => Readable<Y | N>;

/** A keyed list of one node per item; the key is the item, or what `key` returns. Keys are unique. */
export function list<T>(
  source: Readable<readonly T[]>,
  render: (item: T, index: number) => Node,
  key?: (item: T) => unknown,
): LiveValue<Node[]>;
