import type { LiveValue } from 'fiorejs/type/base.dom.d.ts';

declare const SIGNAL: unique symbol;

export interface Signal<T> extends LiveValue<T> {
  readonly [SIGNAL]: true;
  get(): T;
  /** A computed value derived from this signal's value. */
  computed<U>(fn: (value: T) => U): Computed<U>;
  /** Passes the signal to `fn` and returns its result, for reusable steps. */
  with<R>(fn: (signal: this) => R): R;
  /** Renders a list and reuses the rows of items it has seen; the item itself is the key, so `render` gets the item. */
  map<U>(this: Signal<readonly U[]>, render: (item: U, index: number) => Node): LiveValue<Node[]>;
  /** Keys the rows of a list by `item.key`, or by what `key` returns. */
  for<U>(this: Signal<readonly U[]>, key?: (item: U) => unknown): Keyed<U>;
  /** Shows what `then` returns for the value while it is truthy, rebuilt when the value changes; add `.else(fn)` for the other case. */
  if<A>(then: (value: Truthy<T>) => A): When<A, null, T>;
  /**
   * Shows what `render` returns for the value while it matches, rebuilt when the value changes, and nothing otherwise. A
   * function is a test on the value; any other value is compared with `Object.is`. Add more `.case` calls and
   * `.else(fn)`; the first match wins.
   */
  case<A>(match: T | Test<T>, render: (value: T) => A): When<A, null, T>;
}

/** The values of `T` that are truthy, as far as types tell. */
type Truthy<T> = Exclude<T, false | 0 | 0n | '' | null | undefined>;

/** A test on a value. Written as a method, so a signal of a narrower type still fits where a wider one is expected. */
type Test<T> = { test(value: T): unknown }['test'];

/** A live value that shows the branch of the first matching case, or the other branch; only the shown branch is built. */
export interface When<A, B, T = unknown> extends LiveValue<A | B> {
  /** Adds a case, tried after the earlier ones; `render` gets the value. */
  case<C>(match: T | Test<T>, render: (value: T) => C): When<A | C, B, T>;
  /** Shows what `otherwise` returns while no case matches. */
  else<C>(otherwise: () => C): When<A, C, T>;
}

/** A signal of a list with its key, waiting for `map`. */
export interface Keyed<T> {
  /** Renders the list and reuses the rows of items whose key it has seen; `render` gets a signal of the row's current item. */
  map(render: (item: Signal<T>, index: number) => Node): LiveValue<Node[]>;
}

export interface State<T> extends Signal<T> {
  set(value: T): void;
  /** Sets the value that `fn` returns for the current value, for example `(count) => count + 1`. */
  update(fn: (value: T) => T): void;
  /** Changes the value in place, for example with `list.push(item)`, and always notifies; the return value is ignored. */
  mutate(fn: (value: T) => unknown): void;
}

export interface Computed<T> extends Signal<T> {}

/** A plain value or a signal; components that accept it work with static and live data. */
export type Reactive<T> = T | Signal<T>;

export function state<T>(value: T): State<T>;
export function computed<T>(fn: () => T): Computed<T>;
/** Runs `fn` now and again in the next flush after a signal it read changed; returns a function that stops it. */
export const effect: {
  (fn: () => void | (() => void)): () => void;
  /** Like `effect`, but its runs come before the effects and bindings of a flush. */
  pre(fn: () => void | (() => void)): () => void;
  /** Like `effect`, but its runs come after the effects and bindings of a flush, and its first run waits for the next flush. */
  post(fn: () => void | (() => void)): () => void;
};
/** Returns `select(key)`, true while `source` equals `key`; a change of `source` tells only the readers of the old and the new key. */
export function selector<T>(source: Signal<T> | (() => T)): (key: T) => Signal<boolean>;
/** Runs the waiting effects and bindings now instead of on the next microtask. */
export function flush(): void;
/** Resolves after the waiting effects and bindings have run; rejects with the first error of that flush. */
export function tick(): Promise<void>;
/** Runs `fn` with a new owner and returns a function that stops everything `fn` created. */
export function root(fn: () => void): () => void;
/** Runs `fn` when the current owner stops: a root, a branch, a list row, or the next run of an effect. With no owner it never runs. */
export function onCleanup(fn: () => void): void;
/** Runs `fn` without subscribing to the signals it reads; what it creates still belongs to the current owner. */
export function untrack<T>(fn: () => T): T;
export function isSignal(value: unknown): value is Signal<unknown>;
export function read<T>(value: Reactive<T> | (() => T)): T;
/** A class list for `className` or the `class` attribute: strings are always on, object keys while their value is truthy. */
export function classList(
  entries:
    | string
    | Record<string, Reactive<unknown> | (() => unknown)>
    | readonly (string | Record<string, Reactive<unknown> | (() => unknown)>)[],
): Computed<string>;

export interface Resource<T> extends Signal<T | undefined> {
  /** True while a load is running. */
  readonly loading: Signal<boolean>;
  /** The error of the last load, cleared when a new load starts. */
  readonly error: Signal<unknown>;
  /** Loads again with the last source value. */
  refetch(): void;
  /** Sets the value without loading. */
  mutate(value: T | undefined): void;
}

export interface ResourceInfo {
  /** Aborts when a newer load starts or the resource is stopped. */
  signal: AbortSignal;
}

export function resource<T>(fetcher: (value: true, info: ResourceInfo) => T | Promise<T>): Resource<T>;
export function resource<S, T>(
  source: Signal<S | null | undefined | false> | (() => S | null | undefined | false),
  fetcher: (value: S, info: ResourceInfo) => T | Promise<T>,
): Resource<T>;

export {};
