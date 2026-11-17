import { SIGNAL, computed } from './signal.js';

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
