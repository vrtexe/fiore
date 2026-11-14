import type { HTMLElementsAttributesMap } from 'fiorejs/type/attributes.d.ts';
import type { ElementProps } from 'fiorejs/type/base.dom.d.ts';
import type { HTMLEventMapOf } from 'fiorejs/type/html.dom.d.ts';
import type { SVGEventMapOf } from 'fiorejs/type/svg.dom.d.ts';

export type Child = Node | string | number | bigint | boolean | null | undefined | Child[];

type Listener<T extends Element, E> =
  | ((this: T, ev: E & { readonly currentTarget: T }) => unknown)
  | {
      handler?: ((this: T, ev: E & { readonly currentTarget: T }) => unknown) | undefined | null;
      options?: boolean | AddEventListenerOptions | undefined | null;
    };

type EventProps<T extends Element, M> = {
  [K in keyof M & string as `on${Capitalize<K>}`]?: Listener<T, M[K]> | undefined | null;
};

type CommonProps<T extends Element> = {
  children?: Child;
  class?: string | undefined | null;
  style?: string | Partial<CSSStyleDeclaration> | undefined | null;
  [event: `on:${string}`]: Listener<T, CustomEvent> | undefined | null;
};

type HTMLTag = keyof HTMLElementTagNameMap & keyof HTMLElementsAttributesMap;
type SVGTag = Exclude<keyof SVGElementTagNameMap, 'a' | 'script' | 'style' | 'title'> &
  keyof HTMLElementsAttributesMap;

type HTMLProps<K extends HTMLTag> = Omit<HTMLElementsAttributesMap[K], 'class' | 'style'> &
  Omit<ElementProps<HTMLElementTagNameMap[K]>, keyof HTMLElementsAttributesMap[K] | 'style'> &
  EventProps<HTMLElementTagNameMap[K], HTMLEventMapOf<HTMLElementTagNameMap[K]>> &
  CommonProps<HTMLElementTagNameMap[K]>;

type SVGProps<K extends SVGTag> = Omit<HTMLElementsAttributesMap[K], 'class' | 'className' | 'style'> &
  EventProps<SVGElementTagNameMap[K], SVGEventMapOf<SVGElementTagNameMap[K]>> &
  CommonProps<SVGElementTagNameMap[K]>;

type HTMLIntrinsicElements = { [K in HTMLTag]: HTMLProps<K> };
type SVGIntrinsicElements = { [K in SVGTag]: SVGProps<K> };

export namespace JSX {
  type Element = Node;

  interface ElementChildrenAttribute {
    children: {};
  }

  interface IntrinsicElements extends HTMLIntrinsicElements, SVGIntrinsicElements {
    [tag: `${string}-${string}`]: CommonProps<HTMLElement> &
      EventProps<HTMLElement, HTMLElementEventMap> & { [name: string]: unknown };
  }
}

export function jsx(
  type: string | ((props: any) => Node),
  props: Record<string, unknown>,
  key?: unknown,
): Node;

export { jsx as jsxs };

export function Fragment(props: { children?: Child }): DocumentFragment;
