/** @import { type Plugin, type BindContext } from '../types/base.dom.d.ts' */

/** @type {Plugin[]} */
const plugins = [];

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
  return plugins.some((plugin) => plugin.bind?.(value, apply, context) === true);
}
