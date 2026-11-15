/** @import { type Plugin, type BindContext } from '../types/base.dom.d.ts' */

const LOADED = Symbol.for('fiorejs.loaded');

// @ts-expect-error marker on the global object
const firstCopy = globalThis[LOADED];
if (firstCopy && firstCopy !== import.meta.url) {
  console.warn(
    `fiorejs is loaded twice, from ${firstCopy} and ${import.meta.url}. ` +
      'Plugins registered on one copy do not apply to elements created by the other; ' +
      'make every import resolve fiorejs to the same URL.',
  );
} else {
  // @ts-expect-error marker on the global object
  globalThis[LOADED] = import.meta.url;
}

/** @type {Map<string, Plugin>} */
const registry = new Map();

/** @type {Plugin[]} Registered plugins in the order they are asked: 'pre', then unordered, then 'post'. */
export let plugins = [];

/** @param {Plugin} plugin */
function rank(plugin) {
  return plugin.order === 'pre' ? 0 : plugin.order === 'post' ? 2 : 1;
}

/**
 * Registers a plugin; a plugin with the same name replaces the earlier one.
 * @param {Plugin} plugin
 */
export function use(plugin) {
  if (!plugin?.name) {
    throw new TypeError('use() needs a plugin with a name');
  }
  registry.set(plugin.name, plugin);
  plugins = [...registry.values()].sort((a, b) => rank(a) - rank(b));
}

/**
 * Offers a value to the plugins; returns true when one of them binds it.
 * @param {unknown} value
 * @param {(value: unknown) => void} apply
 * @param {BindContext} context
 */
export function bind(value, apply, context) {
  for (let i = 0; i < plugins.length; i++) {
    if (plugins[i]?.bind?.(value, apply, context) === true) {
      return true;
    }
  }
  return false;
}
