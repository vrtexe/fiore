import type { HTMLElementsAttributesMap, SVGAttributes } from './attributes.d.ts';
import type { CustomEventData, TagData } from './base.dom.d.ts';
import type { Builder, Tag } from '../core/builder.js';

export type SVGEventMapOf<T extends SVGElement> = T extends SVGSVGElement
  ? SVGSVGElementEventMap
  : SVGElementEventMap;

export type SVGDomEventListener<
  T extends SVGElement,
  K extends keyof E,
  E extends SVGElementEventMap = SVGElementEventMap,
> = (this: T, ev: E[K] & { readonly currentTarget: T }) => unknown;

export type SVGDomEventListenerOption<
  T extends SVGElement,
  K extends keyof E,
  E extends SVGElementEventMap = SVGElementEventMap,
> = {
  handler?: SVGDomEventListener<T, K, E> | undefined | null;
  options?: boolean | AddEventListenerOptions | undefined | null;
};

export type SVGElementEventData<
  T extends SVGElement,
  E extends SVGElementEventMap = SVGEventMapOf<T>,
> = {
  [K in keyof E]?:
    | SVGDomEventListener<T, K, E>
    | SVGDomEventListenerOption<T, K, E>
    | undefined
    | null;
} & CustomEventData<T>;

export type SVGElementData<
  T extends keyof SVGElementTagNameMap,
  E extends SVGElementEventMap = SVGEventMapOf<SVGElementTagNameMap[T]>,
> = TagData<SVGElementTagNameMap[T], HTMLElementsAttributesMap[T], SVGElementEventData<SVGElementTagNameMap[T], E>>;

export type SVGTag<T extends keyof SVGElementTagNameMap> = Tag<
  SVGElementTagNameMap[T],
  HTMLElementsAttributesMap[T],
  SVGElementEventData<SVGElementTagNameMap[T]>
>;

/** A builder of any SVG element; `SVGModifier` functions accept every SVG tag. */
export type SVGBuilder<T extends SVGElement = SVGElement> = Builder<T, SVGAttributes<T>, SVGElementEventData<T>>;

/** A reusable modifier for every SVG tag. */
export type SVGModifier = (builder: SVGBuilder) => SVGBuilder;
