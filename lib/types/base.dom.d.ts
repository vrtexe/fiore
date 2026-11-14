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

/** Plugins add the types of the live values they bind, e.g. `state: State<T>`. */
export interface LiveValues<T> {}

export type Live<T> = T | LiveValues<T>[keyof LiveValues<T>];

export type LiveAttributes<A> = {
  [K in keyof A as K extends `on${string}` ? never : K]: Live<A[K]>;
};

export type BindContext =
  | { element: BaseElement; kind: 'property' | 'attribute'; name: string }
  | { element: BaseElement; kind: 'child' };

export type Plugin = {
  /** Identifies the plugin; registering the same name again replaces it. */
  name: string;
  /** Return true to take over the value; call `apply` now and whenever it changes. */
  bind?(value: unknown, apply: (value: unknown) => void, context: BindContext): boolean | void;
};

export type PickWritable<T> = Pick<T, WritableKeys<T>>;

export type Children =
  | Live<string | BaseElement | (BaseElement | string)[]>
  | Live<BaseElement | string>[];

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
