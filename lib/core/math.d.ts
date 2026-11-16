/** @import { Callback } from './builder.js' */
/** @import { MathElementEventData, MathElementTagNameMap, MathTag } from '../types/math.dom.d.ts' */
/** @import { HTMLElementsAttributesMap } from '../types/attributes.d.ts' */
/**
 * Returns the tag of any MathML element by name.
 * @template {keyof MathElementTagNameMap} K
 * @param {K} name
 * @returns {MathTag<K>}
 */
export function mathElement<K extends keyof MathElementTagNameMap>(name: K): MathTag<K>;
/**
 * Builds MathML elements.
 * @template {keyof MathElementTagNameMap} K
 * @extends {Builder<MathElementTagNameMap[K], HTMLElementsAttributesMap[K], MathElementEventData<MathElementTagNameMap[K]>>}
 */
export class MathBuilder<K extends keyof MathElementTagNameMap> extends Builder<MathElementTagNameMap[K], HTMLElementsAttributesMap[K], MathElementEventData<MathElementTagNameMap[K]>> {
    /**
     * @param {K} name
     * @param {object} [props]
     * @param {object} [attrs]
     * @param {readonly object[]} [on]
     * @param {readonly Callback<MathElementTagNameMap[K]>[]} [also]
     */
    constructor(name: K, props?: object, attrs?: object, on?: readonly object[], also?: readonly Callback<MathElementTagNameMap[K]>[]);
    /** @override */
    override make(): MathMLElement;
    /**
     * @param {object} [props]
     * @param {object} [attrs]
     * @param {readonly object[]} [on]
     * @param {readonly Callback<MathElementTagNameMap[K]>[]} [also]
     * @override
     */
    override next(props?: object, attrs?: object, on?: readonly object[], also?: readonly Callback<MathElementTagNameMap[K]>[]): MathBuilder<K>;
    #private;
}
import type { MathElementTagNameMap } from '../types/math.dom.d.ts';
import type { MathTag } from '../types/math.dom.d.ts';
import type { HTMLElementsAttributesMap } from '../types/attributes.d.ts';
import type { MathElementEventData } from '../types/math.dom.d.ts';
import { Builder } from './builder.js';
import type { Callback } from './builder.js';
