/** @import { Callback, Ref } from './builder.js' */
/** @import { SVGElementEventData, SVGTag } from '../types/svg.dom.d.ts' */
/** @import { HTMLElementsAttributesMap } from '../types/attributes.d.ts' */
/**
 * Returns the tag of any SVG element by name.
 * @template {keyof SVGElementTagNameMap} K
 * @param {K} name
 * @returns {SVGTag<K>}
 */
export function svgElement<K extends keyof SVGElementTagNameMap>(name: K): SVGTag<K>;
/**
 * Builds SVG elements.
 * @template {keyof SVGElementTagNameMap} K
 * @extends {Builder<SVGElementTagNameMap[K], HTMLElementsAttributesMap[K], SVGElementEventData<SVGElementTagNameMap[K]>>}
 */
export class SVGBuilder<K extends keyof SVGElementTagNameMap> extends Builder<SVGElementTagNameMap[K], HTMLElementsAttributesMap[K], SVGElementEventData<SVGElementTagNameMap[K]>> {
    /**
     * @param {K} name
     * @param {object} [props]
     * @param {object} [attrs]
     * @param {readonly object[]} [on]
     * @param {readonly (Callback<SVGElementTagNameMap[K]> | Ref<any>)[]} [also]
     */
    constructor(name: K, props?: object, attrs?: object, on?: readonly object[], also?: readonly (Callback<SVGElementTagNameMap[K]> | Ref<any>)[]);
    /**
     * @param {object} [props]
     * @param {object} [attrs]
     * @param {readonly object[]} [on]
     * @param {readonly (Callback<SVGElementTagNameMap[K]> | Ref<any>)[]} [also]
     * @override
     */
    override next(props?: object, attrs?: object, on?: readonly object[], also?: readonly (Callback<SVGElementTagNameMap[K]> | Ref<any>)[]): SVGBuilder<K>;
    #private;
}
import type { SVGTag } from '../types/svg.dom.d.ts';
import type { HTMLElementsAttributesMap } from '../types/attributes.d.ts';
import type { SVGElementEventData } from '../types/svg.dom.d.ts';
import { Builder } from './builder.js';
import type { Callback } from './builder.js';
import type { Ref } from './builder.js';
