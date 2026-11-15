import {
  assignProperties,
  own,
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

  const props = own(data, 'props');
  assignProperties(element, props);
  setAttributes(element, own(data, 'attributes'));
  replaceChildren(element, own(data, 'children'));
  assignProperties(element, props, true);
  // @ts-expect-error MathML elements use the same listener handling as SVG elements
  attachEventListenerSvg(element, own(data, 'event'));

  return element;
}
