import { LIVE } from 'fiorejs';
import { adopt, own } from './tracking.js';
import { attach } from './dom.js';
import { state } from './signal.js';

/**
 * @template T
 * @typedef {import('./signal.js').Signal<T>} Signal
 */

/**
 * @typedef {{ first: Node | null, last: Node | null, stop: () => void, pass: number, item: (Signal<unknown> & { set(value: unknown): void }) | undefined }} Row
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
 * row was created; a reused row keeps it. A keyed list gives `render` a signal of the item, which the list sets when a
 * new array keeps the key with another object; a list keyed by the item itself gives the item.
 * @template T
 */
export class List {
  /**
   * @param {Signal<readonly T[]>} source
   * @param {(item: any, index: number) => Node} render
   * @param {(item: T) => unknown} key
   * @param {boolean} live whether `render` gets a signal of the item
   */
  constructor(source, render, key, live) {
    this._source = source;
    this._render = render;
    this._key = key;
    this._live = live;
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

    // Alone in its element, the list owns all of the element's nodes, so it can remove them in one step.
    const parent = context.kind === 'child' && context.anchor === context.element ? context.element : null;

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
        const items = this._source.get();
        try {
          items.forEach((item, index) => {
            const id = this._key(item);
            let row = rows.get(id)?.find((candidate) => candidate.pass !== pass);
            if (!row) {
              row = this._live ? createLiveRow(this._render, item, index) : createRow(() => this._render(item, index));
              created.push(row);
            } else if (row.item !== undefined) {
              row.item.set(item);
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
        // No row stays, so the old rows leave the element at once instead of one by one; the new ones are inserted next.
        if (parent !== null && created.length === items.length && parent.firstChild !== null) {
          parent.textContent = '';
        }
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
  return { first: fragment ? node.firstChild : node, last: fragment ? node.lastChild : node, stop, pass: 0, item: undefined };
}

/**
 * Renders a row that gets a signal of its item.
 * @param {(item: Signal<unknown>, index: number) => Node} render
 * @param {unknown} value
 * @param {number} index
 * @returns {Row}
 */
function createLiveRow(render, value, index) {
  // A state, read-only through the types: only the list sets it.
  const item = state(value);
  const row = createRow(() => render(item, index));
  row.item = item;
  return row;
}
