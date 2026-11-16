import type { HTMLElementsAttributesMap } from 'fiorejs/type/attributes.d.ts';
import type { ElementProps, Live, LiveAttributes } from 'fiorejs/type/base.dom.d.ts';
import type { HTMLEventMapOf } from 'fiorejs/type/html.dom.d.ts';
import type { SVGEventMapOf } from 'fiorejs/type/svg.dom.d.ts';

type ChildValue = Node | string | number | bigint | boolean | null | undefined | ChildValue[];

/** A child: a value, a live value such as a signal from @fiorejs/signals, or a list of children. */
export type Child = Live<ChildValue> | Child[];

type Listener<T extends Element, E> =
  | ((this: T, ev: E & { readonly currentTarget: T }) => unknown)
  | {
      handler?: ((this: T, ev: E & { readonly currentTarget: T }) => unknown) | undefined | null;
      options?: boolean | AddEventListenerOptions | undefined | null;
    };

type EventProps<T extends Element, M> = {
  [K in keyof M & string as `on${K}` | `on${Capitalize<K>}`]?: Listener<T, M[K]> | undefined | null;
};

type CommonProps<T extends Element> = {
  /** Accepted and ignored, because nothing is diffed. */
  key?: string | number | bigint | null | undefined;
  children?: Child;
  class?: Live<string | undefined | null>;
  style?: Live<string | Partial<CSSStyleDeclaration> | undefined | null>;
  [event: `on${string}-${string}`]: Listener<T, CustomEvent> | undefined | null;
};

type HTMLTag = keyof HTMLElementTagNameMap & keyof HTMLElementsAttributesMap;
type SVGTag = Exclude<keyof SVGElementTagNameMap, 'a' | 'script' | 'style' | 'title'> &
  keyof HTMLElementsAttributesMap;

type HTMLProps<K extends HTMLTag> = Omit<LiveAttributes<HTMLElementsAttributesMap[K]>, 'class' | 'style'> &
  Omit<
    ElementProps<HTMLElementTagNameMap[K]>,
    keyof HTMLElementsAttributesMap[K] | `on${string}` | 'style'
  > &
  EventProps<HTMLElementTagNameMap[K], HTMLEventMapOf<HTMLElementTagNameMap[K]>> &
  CommonProps<HTMLElementTagNameMap[K]>;

type SVGProps<K extends SVGTag> = Omit<LiveAttributes<HTMLElementsAttributesMap[K]>, 'class' | 'className' | 'style'> &
  EventProps<SVGElementTagNameMap[K], SVGEventMapOf<SVGElementTagNameMap[K]>> &
  CommonProps<SVGElementTagNameMap[K]>;

type HTMLIntrinsicElements = { [K in HTMLTag]: HTMLProps<K> };
type SVGIntrinsicElements = { [K in SVGTag]: SVGProps<K> };

export namespace JSX {
  type Element = Node;

  /** Components may be async; their place stays empty until they resolve. */
  type ElementType = string | ((props: any) => Node | Promise<Node>);

  interface ElementChildrenAttribute {
    children: {};
  }

  /** Accepted on every element and component and ignored, because nothing is diffed. */
  interface IntrinsicAttributes {
    key?: string | number | bigint | null | undefined;
  }

  interface IntrinsicElements extends HTMLIntrinsicElements, SVGIntrinsicElements {
    [tag: `${string}-${string}`]: CommonProps<HTMLElement> &
      EventProps<HTMLElement, HTMLElementEventMap> & { [name: string]: unknown };
  }
}

export function jsx(
  type: string | ((props: any) => Node | Promise<Node>),
  props: Record<string, unknown>,
  key?: unknown,
): Node;

export { jsx as jsxs };

export function Fragment(props: { children?: Child }): DocumentFragment;
