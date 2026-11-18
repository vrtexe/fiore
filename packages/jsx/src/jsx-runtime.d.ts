import type { HTMLElementsAttributesMap } from 'fiorejs/type/attributes.d.ts';
import type { DatasetProps, ElementProps, Live, LiveAttributes, RecursivePartial } from 'fiorejs/type/base.dom.d.ts';
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

/** Listener props: `on` and the event name, or the name with a capital first letter; the runtime lowercases that letter. */
type EventProps<T extends Element, M> = {
  [K in keyof M & string as `on${K}` | `on${Capitalize<K>}`]?: Listener<T, M[K]> | undefined | null;
};

type CommonProps<T extends Element> = {
  /** Accepted and ignored, because nothing is diffed. */
  key?: string | number | bigint | null | undefined;
  children?: Child;
  /** Called with the element once it is built, with its props, attributes, listeners and children, as the builder's `also`. */
  ref?: ((element: T) => void) | undefined | null;
  class?: Live<string | undefined | null>;
  /** A string, or an object of style properties whose values may be live, as in the builder's props. */
  style?: Live<string | RecursivePartial<CSSStyleDeclaration> | undefined | null>;
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
  CommonProps<SVGElementTagNameMap[K]> & { dataset?: DatasetProps | undefined };

type HTMLIntrinsicElements = { [K in HTMLTag]: HTMLProps<K> };

/** A function of the element, written as a method so its element is checked both ways. */
type ElementMethod<T extends Element, E> = { method(this: T, ev: E & { readonly currentTarget: T }): unknown }['method'];

type LooseListener<E> =
  | ElementMethod<HTMLElement, E>
  | {
      handler?: ElementMethod<HTMLElement, E> | undefined | null;
      options?: boolean | AddEventListenerOptions | undefined | null;
    };

/**
 * The props of a custom element that is not declared in HTMLElementTagNameMap: those of an HTMLElement and any other.
 * Its ref and listeners take the element as a method does, so the stricter props of a declared custom element class
 * still fit this index signature.
 */
type CustomElementProps = Omit<CommonProps<HTMLElement>, 'ref' | `on${string}-${string}`> & {
  ref?: { method(element: HTMLElement): void }['method'] | undefined | null;
  [event: `on${string}-${string}`]: LooseListener<CustomEvent> | undefined | null;
} & {
  [K in keyof HTMLElementEventMap & string as `on${K}` | `on${Capitalize<K>}`]?: LooseListener<HTMLElementEventMap[K]> | undefined | null;
} & { [name: string]: unknown };
type SVGIntrinsicElements = { [K in SVGTag]: SVGProps<K> };

export namespace JSX {
  type Element = Node;

  /**
   * A component returns anything a child can be, such as a node, a live value, text or null, and may be async; a result
   * that is not a node comes back in a fragment. An async component's place stays empty until it resolves.
   */
  type ElementType = string | ((props: any) => Child | Promise<Child>);

  interface ElementChildrenAttribute {
    children: {};
  }

  /** Accepted on every element and component and ignored, because nothing is diffed. */
  interface IntrinsicAttributes {
    key?: string | number | bigint | null | undefined;
  }

  interface IntrinsicElements extends HTMLIntrinsicElements, SVGIntrinsicElements {
    [tag: `${string}-${string}`]: CustomElementProps;
  }
}

export function jsx(
  type: string | ((props: any) => Child | Promise<Child>),
  props: Record<string, unknown>,
  key?: unknown,
): Node;

export { jsx as jsxs };

export function Fragment(props: { children?: Child }): DocumentFragment;
