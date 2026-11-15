import {
  assignProperties,
  own,
  attachEventListenerSvg,
  replaceChildren,
  setAttributes,
} from './base.js';

/** @import { type SVGElementData } from "../types/svg.dom.d.ts"; */

/**
 * @template {keyof SVGElementTagNameMap} T
 * @param {T} tag
 * @param {SVGElementData<T>} [data]
 * @return {SVGElementTagNameMap[T]}
 */
export function svgElement(tag, data) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', tag);

  const props = own(data, 'props');
  assignProperties(element, props);
  setAttributes(element, own(data, 'attributes'));
  replaceChildren(element, own(data, 'children'));
  assignProperties(element, props, true);
  attachEventListenerSvg(element, own(data, 'event'));

  return element;
}
