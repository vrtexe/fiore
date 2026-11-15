import {
  assignProperties,
  attachEventListener,
  replaceChildren,
  setAttributes,
} from './base.js';

/** @import { ElementData, DeprecatedElementData } from '../types/html.dom.d.ts' */

/**
 * @template {keyof HTMLElementTagNameMap} T
 * @param {T} tag
 * @param {ElementData<T>} [data]
 * @return {HTMLElementTagNameMap[T]}
 */
export function element(tag, data) {
  const element = document.createElement(tag);

  const props = data?.props;
  assignProperties(element, props);
  setAttributes(element, data?.attributes);
  replaceChildren(element, data?.children);
  assignProperties(element, props, true);
  attachEventListener(element, data?.event);

  return element;
}

/**
 * @deprecated
 * @template {keyof HTMLElementDeprecatedTagNameMap} T
 * @param {T} tag
 * @param {DeprecatedElementData<T>} [data]
 * @return {HTMLElementDeprecatedTagNameMap[T]}
 */
export function deprecatedElement(tag, data) {
  const element = document.createElement(tag);

  const props = data?.props;
  assignProperties(element, props);
  setAttributes(element, data?.attributes);
  replaceChildren(element, data?.children);
  assignProperties(element, props, true);
  attachEventListener(element, data?.event);

  return element;
}
