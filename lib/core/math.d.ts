/** @import { Callback } from './builder.js' */
/** @import { MathElementEventData, MathTag } from '../types/math.dom.d.ts' */
/** @import { HTMLElementsAttributesMap } from '../types/attributes.d.ts' */
/**
 * Returns the tag of any MathML element by name.
 * @template {keyof MathMLElementTagNameMap} K
 * @param {K} name
 * @returns {MathTag<K>}
 */
export function mathElement<K extends keyof MathMLElementTagNameMap>(name: K): MathTag<K>;
/**
 * Builds MathML elements.
 * @template {keyof MathMLElementTagNameMap} K
 * @extends {Builder<MathMLElementTagNameMap[K], HTMLElementsAttributesMap[K], MathElementEventData<MathMLElementTagNameMap[K]>>}
 */
export class MathBuilder<K extends keyof MathMLElementTagNameMap> extends Builder<MathMLElementTagNameMap[K], HTMLElementsAttributesMap[K], MathElementEventData<MathMLElementTagNameMap[K]>> {
    /**
     * @param {K} name
     * @param {object} [props]
     * @param {object} [attrs]
     * @param {readonly object[]} [on]
     * @param {readonly Callback<MathMLElementTagNameMap[K]>[]} [also]
     */
    constructor(name: K, props?: object, attrs?: object, on?: readonly object[], also?: readonly Callback<MathMLElementTagNameMap[K]>[]);
    /**
     * @param {object} [props]
     * @param {object} [attrs]
     * @param {readonly object[]} [on]
     * @param {readonly Callback<MathMLElementTagNameMap[K]>[]} [also]
     * @override
     */
    override next(props?: object, attrs?: object, on?: readonly object[], also?: readonly Callback<MathMLElementTagNameMap[K]>[]): MathBuilder<K>;
    #private;
}
import type { MathTag } from '../types/math.dom.d.ts';
import type { HTMLElementsAttributesMap } from '../types/attributes.d.ts';
import type { MathElementEventData } from '../types/math.dom.d.ts';
import { Builder } from './builder.js';
import type { Callback } from './builder.js';
