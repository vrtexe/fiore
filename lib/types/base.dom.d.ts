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
      /** The nodes the child currently occupies; they can move to another parent, for example from a fragment. */
      nodes(): readonly ChildNode[];
    };

export type Plugin = {
  /** Identifies the plugin; registering the same name again replaces it. */
  name: string;
  /** 'pre' plugins are asked first and 'post' plugins last; otherwise registration order applies. */
  order?: 'pre' | 'post';
  /** Return true to take over the value; call `apply` now and whenever it changes. */
  bind?(value: unknown, apply: (value: unknown) => void, context: BindContext): boolean | void;
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

/**
 * Records settings without touching the DOM. Every method returns a new builder, so one builder can serve as a
 * template; `create()` creates the element and applies props, attributes, children, late props, listeners and the
 * `also` callbacks in that order, whatever the order of the calls.
 */
export interface Builder<T extends BaseElement, A, On> {
  /** DOM properties. Repeated calls combine them; later keys win, so a later `style` object replaces an earlier one. */
  props(map: ElementProps<T>): this;
  /** Attributes. Repeated calls merge: later keys win and `null` removes an earlier value. */
  attrs(map: LiveAttributes<A>): this;
  /** Event listeners, as `{ click: fn }` or `{ click: { handler, options } }`. Repeated calls add listeners. */
  on(map: On): this;
  /** Applies a modifier to this builder, for reusable settings or a condition: `.with((b) => (on ? b.attrs(…) : b))`. */
  with(fn: (builder: this) => this): this;
  /** Calls `fn` with the created element, after the listeners; it is not connected to the document yet. */
  also(fn: (element: T) => void): this;
  /** Creates the element with these children (a node, a string, a number, or an array of these) and returns it. */
  create(children?: Children): T;
}

/** A tag function: call it with a data object or children, or start a builder with one of its methods. */
export interface Tag<T extends BaseElement, A, On> {
  /** A plain object is the data object; anything else is children. */
  (data?: TagData<T, A, On> | Children): T;
  props(map: ElementProps<T>): Builder<T, A, On>;
  attrs(map: LiveAttributes<A>): Builder<T, A, On>;
  on(map: On): Builder<T, A, On>;
  with(fn: (builder: Builder<T, A, On>) => Builder<T, A, On>): Builder<T, A, On>;
  also(fn: (element: T) => void): Builder<T, A, On>;
  create(children?: Children): T;
}

/** A reusable builder function that works on every builder of type `B`, for example every HTML element. */
export type Modifier<B extends Builder<any, any, any>> = <X extends B>(builder: X) => X;
