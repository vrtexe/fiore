/** @import { type Plugin, type BindContext } from '../types/base.dom.d.ts' */

/** @type {Plugin[]} */
export const plugins = [];

/**
 * Registers a plugin that can take over values before they are applied.
 * @param {Plugin} plugin
 */
export function use(plugin) {
  plugins.push(plugin);
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
