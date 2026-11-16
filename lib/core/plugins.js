/** @import { type Plugin, type BindContext } from '../types/base.dom.d.ts' */

const LOADED = Symbol.for('fiorejs.loaded');

const firstCopy = Reflect.get(globalThis, LOADED);
if (firstCopy && firstCopy !== import.meta.url) {
  console.warn(
    `fiorejs is loaded twice, from ${firstCopy} and ${import.meta.url}. ` +
      'Plugins registered on one copy do not apply to elements created by the other; ' +
      'make every import resolve fiorejs to the same URL.',
  );
} else {
  Reflect.set(globalThis, LOADED, import.meta.url);
}

/** @type {Map<string, Plugin>} */
const registry = new Map();

/** @type {Plugin[]} Registered plugins in the order they are asked. */
export let plugins = [];

/**
 * Registers a plugin; a plugin with the same name replaces the earlier one.
 * @param {Plugin} plugin
 */
export function use(plugin) {
  if (typeof plugin?.name !== 'string' || plugin.name === '') {
    throw new TypeError('use() needs a plugin with a name');
  }
  registry.set(plugin.name, plugin);
  plugins = [...registry.values()];
}

/**
 * Offers a value to the plugins; returns true when one of them binds it.
 * @param {unknown} value
 * @param {(value: unknown) => void} apply
 * @param {BindContext} context
 */
export function bind(value, apply, context) {
  for (const plugin of plugins) {
    if (plugin.bind(value, apply, context) === true) {
      return true;
    }
  }
  return false;
}
