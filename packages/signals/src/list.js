import { LIVE } from 'fiorejs';
import { adopt, own } from './tracking.js';
import { attach } from './dom.js';

/**
 * @template T
 * @typedef {import('./signal.js').Signal<T>} Signal
 */

/**
 * @typedef {{ first: Node | null, last: Node | null, stop: () => void, pass: number }} Row
 */

/**
 * The default list key: the item's `key` field.
 * @param {unknown} item
 */
export function itemKey(item) {
  return typeof item === 'object' && item !== null && 'key' in item ? item.key : undefined;
}

/**
 * A live list: every binding keeps its own rows by key and only renders new items. `index` is the item's index when its
 * row was created; a reused row keeps it.
 * @template T
 */
export class List {
  /**
   * @param {Signal<readonly T[]>} source
   * @param {(item: T, index: number) => Node} render
   * @param {(item: T) => unknown} key
   */
  constructor(source, render, key) {
    this._source = source;
    this._render = render;
    this._key = key;
  }

  /**
   * @param {(value: unknown) => void} apply
   * @param {import('fiorejs/type/base.dom.d.ts').BindContext} context
   */
  [LIVE](apply, context) {
    /** @type {Map<unknown, Row[]>} Rows by key; a repeated key keeps one row per occurrence. */
    let rows = new Map();

    /** Counts the passes; a row marked with the current pass is shown, so a repeated key takes the next row. */
    let pass = 0;

    adopt(() => {
      const old = rows;
      rows = new Map();
      for (const list of old.values()) {
        for (const row of list) {
          row.stop();
        }
      }
    });

    attach(
      () => {
        pass++;
        /** @type {Map<unknown, Row[]>} */
        const next = new Map();
        /** @type {Row[]} */
        const created = [];
        /** @type {Node[]} */
        const nodes = [];
        try {
          this._source.get().forEach((item, index) => {
            const id = this._key(item);
            let row = rows.get(id)?.find((candidate) => candidate.pass !== pass);
            if (!row) {
              row = createRow(() => this._render(item, index));
              created.push(row);
            }
            row.pass = pass;
            const list = next.get(id);
            if (list) {
              list.push(row);
            } else {
              next.set(id, [row]);
            }
            for (let node = row.first; node; node = node === row.last ? null : node.nextSibling) {
              nodes.push(node);
            }
          });
        } catch (error) {
          // The old rows stay as they were; only the rows made in this failed pass are stopped.
          created.forEach((row) => row.stop());
          throw error;
        }

        const old = rows;
        rows = next;
        for (const list of old.values()) {
          for (const row of list) {
            if (row.pass !== pass) {
              row.stop();
            }
          }
        }
        return nodes;
      },
      apply,
      context,
    );
  }
}

/**
 * @param {() => Node} render
 * @returns {Row}
 */
function createRow(render) {
  const { value: node, stop } = own(render);
  // A fragment empties when it is inserted, so the row keeps its first and last node; a live child between them can
  // change the nodes in between.
  const fragment = node.nodeType === Node.DOCUMENT_FRAGMENT_NODE;
  return { first: fragment ? node.firstChild : node, last: fragment ? node.lastChild : node, stop, pass: 0 };
}
