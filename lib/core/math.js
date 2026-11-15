import {
  assignProperties,
  attachEventListenerSvg,
  replaceChildren,
  setAttributes,
} from './base.js';

/** @import { type MathElementData } from "../types/math.dom.d.ts"; */
/**
 * @template {keyof MathMLElementTagNameMap} T
 * @param {T} tag
 * @param {MathElementData<T>} [data]
 * @return {MathMLElementTagNameMap[T]}
 */
export function mathElement(tag, data) {
  const element = document.createElementNS('http://www.w3.org/1998/Math/MathML', tag);

  assignProperties(element, data?.props);
  setAttributes(element, data?.attributes);
  replaceChildren(element, data?.children);
  assignProperties(element, data?.props, true);
  // @ts-expect-error MathML elements use the same listener handling as SVG elements
  attachEventListenerSvg(element, data?.event);

  return element;
}
