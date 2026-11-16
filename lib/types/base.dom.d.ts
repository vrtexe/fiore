import type { HTMLElementsAttributesMap } from './attributes.d.ts';

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

/**
 * Plugins add the types of the live values they bind, e.g. `state: State<T>`. A live value must not be a plain object,
 * because plain objects are data objects and nested props such as `style`.
 */
export interface LiveValues<T> {}

export type Live<T> = T | LiveValues<T>[keyof LiveValues<T>];

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
      element: BaseElement;
      kind: 'child';
      /** The comment before the nodes of the child, or the element when the child is its only child. */
      anchor: Node;
    };

export type Plugin = {
  /** Identifies the plugin; registering the same name again replaces it. */
  name: string;
  /** Return true to take over the value; call `apply` now and whenever it changes. */
  bind(value: unknown, apply: (value: unknown) => void, context: BindContext): boolean;
};

export type PickWritable<T> = Pick<T, WritableKeys<T>>;

/** false, true, null and undefined are skipped, so `condition && node` works. */
type Child = Node | string | number | boolean | null | undefined;

export type Children = Live<Child | Child[]> | Live<Child>[];

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
