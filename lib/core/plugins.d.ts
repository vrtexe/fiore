/**
 * Registers a plugin; a plugin with the same name replaces the earlier one.
 * @param {Plugin} plugin
 */
export function use(plugin: Plugin): void;
/**
 * Offers a value to the plugins; returns true when one of them binds it.
 * @param {unknown} value
 * @param {(value: unknown) => void} apply
 * @param {BindContext} context
 */
export function bind(value: unknown, apply: (value: unknown) => void, context: BindContext): boolean;
/** @type {Plugin[]} Registered plugins in the order they are asked: 'pre', then unordered, then 'post'. */
export let plugins: Plugin[];
import type { Plugin } from '../types/base.dom.d.ts';
import type { BindContext } from '../types/base.dom.d.ts';
