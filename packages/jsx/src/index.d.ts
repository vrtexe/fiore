import type { Child } from './jsx-runtime.js';

export { Fragment } from './jsx-runtime.js';
export type { Child, JSX } from './jsx-runtime.js';

export function createElement(
  type: string | ((props: any) => Node | Promise<Node>),
  props?: Record<string, unknown> | null,
  ...children: Child[]
): Node;
