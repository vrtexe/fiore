import {
  assignProperties,
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

  const props = data?.props;
  assignProperties(element, props);
  setAttributes(element, data?.attributes);
  replaceChildren(element, data?.children);
  assignProperties(element, props, true);
  attachEventListenerSvg(element, data?.event);

  return element;
}
