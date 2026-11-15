import type { HTMLAttributes, HTMLElementsAttributesMap } from './attributes.d.ts';
import type { BaseElement, CustomEventData, TagData } from './base.dom.d.ts';
import type { Builder, Tag } from '../core/builder.js';

export type HTMLEventMapOf<T extends HTMLElement> = T extends HTMLBodyElement
  ? HTMLBodyElementEventMap
  : T extends HTMLFrameSetElement
    ? HTMLFrameSetElementEventMap
    : T extends HTMLVideoElement
      ? HTMLVideoElementEventMap
      : T extends HTMLMediaElement
        ? HTMLMediaElementEventMap
        : HTMLElementEventMap;

export type ElementData<
  T extends keyof HTMLElementTagNameMap,
  E extends HTMLElementEventMap = HTMLEventMapOf<HTMLElementTagNameMap[T]>,
> = TagData<HTMLElementTagNameMap[T], HTMLElementsAttributesMap[T], ElementEventData<HTMLElementTagNameMap[T], E>>;

export type HTMLTag<T extends keyof HTMLElementTagNameMap> = Tag<
  HTMLElementTagNameMap[T],
  HTMLElementsAttributesMap[T],
  ElementEventData<HTMLElementTagNameMap[T]>
>;

/** A builder of any HTML element; `HTMLModifier` functions accept every HTML tag. */
export type HTMLBuilder<T extends HTMLElement = HTMLElement> = Builder<T, HTMLAttributes<T>, ElementEventData<T>>;

/** A reusable modifier for every HTML tag: `const card: HTMLModifier = (b) => b.props({ className: 'card' })`. */
export type HTMLModifier = (builder: HTMLBuilder) => HTMLBuilder;

export type DomEventListener<
  T extends BaseElement,
  K extends keyof E,
  E extends HTMLElementEventMap = HTMLElementEventMap,
> = (this: T, ev: E[K] & { readonly currentTarget: T }) => unknown;

export type DomEventListenerOption<
  T extends HTMLElement,
  K extends keyof E,
  E extends HTMLElementEventMap = HTMLElementEventMap,
> = {
  handler?: DomEventListener<T, K, E> | undefined | null;
  options?: boolean | AddEventListenerOptions | undefined | null;
};

export type CustomEventListenerOption = {
  handler?: EventListenerOrEventListenerObject | undefined | null;
  options?: boolean | AddEventListenerOptions | undefined | null;
};

export type ElementEventData<
  T extends HTMLElement,
  E extends HTMLElementEventMap = HTMLEventMapOf<T>,
> = {
  [K in keyof E]?:
    | DomEventListener<T, K, E>
    | DomEventListenerOption<T, K, E>
    | undefined
    | null;
} & CustomEventData<T>;

export type DeprecatedElementData<
  T extends keyof HTMLElementDeprecatedTagNameMap,
  E extends HTMLElementEventMap = HTMLEventMapOf<HTMLElementDeprecatedTagNameMap[T]>,
> = TagData<
  HTMLElementDeprecatedTagNameMap[T],
  HTMLElementsAttributesMap[T],
  ElementEventData<HTMLElementDeprecatedTagNameMap[T], E>
>;

export type DeprecatedHTMLTag<T extends keyof HTMLElementDeprecatedTagNameMap> = Tag<
  HTMLElementDeprecatedTagNameMap[T],
  HTMLElementsAttributesMap[T],
  ElementEventData<HTMLElementDeprecatedTagNameMap[T]>
>;
