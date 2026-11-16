import type { LiveValue } from 'fiorejs/type/base.dom.d.ts';

declare const SIGNAL: unique symbol;

export interface Signal<T> extends LiveValue<T> {
  readonly [SIGNAL]: true;
  get(): T;
  /** A computed value derived from this signal's value. */
  computed<U>(fn: (value: T) => U): Computed<U>;
  /** Passes the signal to `fn` and returns its result, for reusable steps. */
  with<R>(fn: (signal: this) => R): R;
  /** Renders a list and reuses the rows of items it has seen; the item itself is the key. */
  map<U>(this: Signal<readonly U[]>, render: (item: U, index: number) => Node): LiveValue<Node[]>;
  /** Keys the rows of a list by `item.key`, or by what `key` returns. */
  for<U>(this: Signal<readonly U[]>, key?: (item: U) => unknown): Keyed<U>;
}

/** A signal of a list with its key, waiting for `map`. */
export interface Keyed<T> {
  /** Renders the list and reuses the rows of items whose key it has seen. */
  map(render: (item: T, index: number) => Node): LiveValue<Node[]>;
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
export function effect(fn: () => void | (() => void)): () => void;
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
  mutate(value: T): void;
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
