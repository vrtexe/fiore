/** @import { type Plugin, type BindContext } from '../types/base.dom.d.ts' */

const LOADED = Symbol.for('fiorejs.loaded');

// @ts-expect-error marker on the global object
const firstCopy = globalThis[LOADED];
if (firstCopy) {
  console.warn(
    `fiorejs is loaded twice, from ${firstCopy} and ${import.meta.url}. ` +
      'Plugins registered on one copy do not apply to elements created by the other; ' +
      'make every import resolve fiorejs to the same URL.',
  );
} else {
  // @ts-expect-error marker on the global object
  globalThis[LOADED] = import.meta.url;
}

/** @type {Plugin[]} */
export const plugins = [];

/**
 * Registers a plugin; a plugin with the same name replaces the earlier one.
 * @param {Plugin} plugin
 */
export function use(plugin) {
  const index = plugins.findIndex((registered) => registered.name === plugin.name);
  if (index === -1) {
    plugins.push(plugin);
  } else {
    plugins[index] = plugin;
  }
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
