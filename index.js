import { jsx } from './jsx-runtime.js';

export { Fragment } from './jsx-runtime.js';

/**
 * The classic createElement(type, props, ...children). Compilers call it instead of jsx() when a key follows a
 * spread, as in <li {...props} key="a" />; the key is ignored.
 * @param {string | ((props: any) => Node | Promise<Node>)} type
 * @param {Record<string, unknown> | null} [props]
 * @param {...unknown} children
 * @returns {Node | Promise<Node>}
 */
export function createElement(type, props, ...children) {
  /** @type {Record<string, unknown>} */
  const rest = { ...props };
  delete rest.key;
  if (children.length > 0) {
    rest.children = children.length === 1 ? children[0] : children;
  }
  return jsx(type, rest);
}
