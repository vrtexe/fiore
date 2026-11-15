import type { HTMLElementsAttributesMap } from './attributes.d.ts';
import type { CustomEventData, TagData } from './base.dom.d.ts';
import type { Tag } from '../core/builder.js';

export type MathDomEventListener<
  T extends MathMLElement,
  K extends keyof E,
  E extends MathMLElementEventMap = MathMLElementEventMap,
> = (this: T, ev: E[K] & { readonly currentTarget: T }) => unknown;

export type MathDomEventListenerOption<
  T extends MathMLElement,
  K extends keyof E,
  E extends MathMLElementEventMap = MathMLElementEventMap,
> = {
  handler?: MathDomEventListener<T, K, E> | undefined | null;
  options?: boolean | AddEventListenerOptions | undefined | null;
};

export type MathElementEventData<
  T extends MathMLElement,
  E extends MathMLElementEventMap = MathMLElementEventMap,
> = {
  [K in keyof E]?:
    | MathDomEventListener<T, K, E>
    | MathDomEventListenerOption<T, K, E>
    | undefined
    | null;
} & CustomEventData<T>;

export type MathElementData<
  T extends keyof MathMLElementTagNameMap,
  E extends MathMLElementEventMap = MathMLElementEventMap,
> = TagData<MathMLElementTagNameMap[T], HTMLElementsAttributesMap[T], MathElementEventData<MathMLElementTagNameMap[T], E>>;

export type MathTag<T extends keyof MathMLElementTagNameMap> = Tag<
  MathMLElementTagNameMap[T],
  HTMLElementsAttributesMap[T],
  MathElementEventData<MathMLElementTagNameMap[T]>
>;
