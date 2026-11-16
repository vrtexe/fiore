import type { HTMLElementsAttributesMap } from './attributes.d.ts';
import type { LIVE } from '../core/base.js';

export type IfEquals<X, Y, A = X, B = never> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? A : B;

export type WritableKeys<T> = {
  [P in keyof T]-?: IfEquals<
    { [Q in P]: T[P] },
    { -readonly [Q in P]: T[P] },
    P
  >;
}[keyof T];

export type ReadonlyKeys<T> = {
  [P in keyof T]-?: IfEquals<
    { [Q in P]: T[P] },
    { -readonly [Q in P]: T[P] },
    never,
    P
  >;
}[keyof T];

export type RecursivePartial<T> = {
  [P in keyof T]?: Live<T[P] extends object ? RecursivePartial<T[P]> : T[P]>;
};

/** A live value: core calls its [LIVE] method with an `apply` to call now and whenever the value changes. */
export type LiveValue<T> = {
  [LIVE](apply: (value: T) => void, context: BindContext): void;
};

export type Live<T> = T | LiveValue<T>;

export type LiveAttributes<A> = {
  [K in keyof A as K extends `on${string}` ? never : K]: Live<A[K]>;
};

export type BindContext =
  | {
      element: BaseElement;
      kind: 'property';
      name: string;
      /** The full key path for nested props, for example ['style', 'color']. */
      path: string[];
    }
  | { element: BaseElement; kind: 'attribute'; name: string }
  | {
      /** The element, or the fragment, the child is built into. */
      element: BaseElement | DocumentFragment;
      kind: 'child';
      /** The comment before the nodes of the child, or the element when the child is its only child. */
      anchor: Node;
    };

export type PickWritable<T> = Pick<T, WritableKeys<T>>;

/** false, true, null and undefined are skipped, so `condition && node` works. */
type Child = Node | string | number | bigint | boolean | null | undefined;

/** An item of a children array: a child, a live value of children, or a nested array, flattened at any depth. */
type NestedChild = Child | LiveValue<Child | Child[]> | NestedChild[];

/** One child, a live value of children, or an array of children nested as deep as needed. */
export type Children = Live<Child | Child[]> | NestedChild[];

export type ElementProps<T extends BaseElement> = PickWritable<
  RecursivePartial<T>
>;

export type BaseElement = Element;

export type CustomEventListener<T extends BaseElement> = (
  this: T,
  ev: CustomEvent & { readonly currentTarget: T },
) => unknown;

export type CustomEventData<T extends BaseElement> = {
  [name: `${string}-${string}`]:
    | CustomEventListener<T>
    | {
        handler?: CustomEventListener<T> | undefined | null;
        options?: boolean | AddEventListenerOptions | undefined | null;
      }
    | undefined
    | null;
};

/** The data object of a plain tag call, and what a builder records. */
export type TagData<T extends BaseElement, A, On> = {
  props?: ElementProps<T> | undefined | null;
  attrs?: LiveAttributes<A> | undefined | null;
  on?: On | undefined | null;
  children?: Children | undefined | null;
};
