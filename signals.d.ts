import type { Plugin } from 'fiorejs/type/base.dom.d.ts';

declare const SIGNAL: unique symbol;

export interface Signal<T> {
  readonly [SIGNAL]: true;
  get(): T;
}

export interface State<T> extends Signal<T> {
  set(value: T): void;
  /** Changes the value in place, for example with `list.push(item)`, and always notifies; the return value is ignored. */
  update(fn: (value: T) => unknown): void;
}

export interface Computed<T> extends Signal<T> {}

/** A plain value, a signal or a getter; components that accept it work with static and live data. */
export type Reactive<T> = T | Signal<T> | (() => T);

export function state<T>(value: T): State<T>;
export function computed<T>(fn: () => T): Computed<T>;
export function effect(fn: () => void | (() => void)): () => void;
export function untrack<T>(fn: () => T): T;
export function isSignal(value: unknown): value is Signal<unknown>;
export function read<T>(value: Reactive<T>): T;
export function each<T>(
  items: Reactive<readonly T[]>,
  render: (item: T, index: number) => Node,
  key?: (item: T) => unknown,
): () => Node[];

export const plugin: Plugin;

declare module 'fiorejs/type/base.dom.d.ts' {
  interface LiveValues<T> {
    signal: Signal<T>;
    getter: () => T;
  }
}
