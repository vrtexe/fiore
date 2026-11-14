/**
 * Registers a plugin that can take over values before they are applied.
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
/** @import { type Plugin, type BindContext } from '../types/base.dom.d.ts' */
/** @type {Plugin[]} */
export const plugins: Plugin[];
import type { Plugin } from '../types/base.dom.d.ts';
import type { BindContext } from '../types/base.dom.d.ts';
