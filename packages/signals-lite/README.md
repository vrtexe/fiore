# @fiorejs/signals-lite

Small, fast signals for [fiorejs](https://github.com/vrtexe/fiore). A state, computed or list binds to a property, an attribute or a child of a fiorejs element, and only that spot of the DOM updates.

`@fiorejs/signals` has the larger API: methods on signals (`.map`, `.for`, `.if`, `.case`), async resources, effect phases, and bindings that pause while their element is out of the document. This package keeps the core and is built for speed:

- The dependency graph is a set of linked lists. Each edge is one object that sits in both the source's and the reader's list, and a run that reads the same sources as last time reuses its edges and allocates nothing.
- Changes are pushed and checked with flags, in loops over shared work stacks. No graph walk is recursive, so long chains of computeds cannot overflow the stack. Only the first read of a chain of computeds that was never read nests, because each computed reads the next one.
- Every node has the same fields in the same order, so the engine sees one object shape.
- Effects and bindings run once per microtask, after all the writes of the current task.
- What an effect, a root or a list row creates belongs to it and is stopped with it. There is no `MutationObserver`.

## Install

```sh
npm install fiorejs @fiorejs/signals-lite
```

## Use

```js
import { tbody, tr, td, a } from 'fiorejs';
import { state, computed, effect, selector, list } from '@fiorejs/signals-lite';

const rows = state([{ id: 1, label: state('one') }]);
const selected = state(0);
const danger = selector(selected, 'danger', '');

const Row = (row) =>
  tr.props({ className: danger(row.id) }).create([
    td.create(row.id),
    td.create(a.on({ click: () => selected.set(row.id) }).create(row.label)),
  ]);

document.body.append(tbody(list(rows, Row)));

const count = computed(() => rows.get().length);
effect(() => console.log('rows:', count.get()));
```

## API

- `state(value)`: a value with `get()` and `set(value)`. A `set` with the same value (`Object.is`) does nothing.
- `computed(fn)`: a cached value with `get()`. `fn` gets the previous value. It recalculates on read after a source changed, and readers do not run again when it recalculates to the same value.
- `effect(fn)`: runs `fn` now and again after a signal it read changed. `fn` may return a cleanup. Returns a function that stops the effect. The effects created by a run are stopped before the next run.
- `root(fn)`: runs `fn` with a new owner and returns a function that stops everything `fn` created.
- `untrack(fn)`: runs `fn` without subscribing to what it reads.
- `flush()`: runs the waiting effects and bindings now instead of on the next microtask.
- `selector(source, yes = true, no = false)`: returns `select(key)`, a signal that is `yes` while `source` equals `key` and `no` otherwise. A change of `source` writes the signals of the old and the new key only, whatever the number of keys, which makes selecting a row in a long list cost the same as in a short one.
- `list(source, render, key?)`: a child that renders one node per item. A row is kept, with its node and its bindings, while its key stays in the list; the key is the item, or what `key(item)` returns, and keys must be unique. `render` returns a single node. When the list is the only child of its element, clearing it and replacing all of its rows empty the element in one step.

## Rules

- A binding lives as long as its owner: the effect, root or list row it was created in. A binding created outside any owner lives as long as the page; create long-lived UI inside `root`.
- A computed may write a signal it read. The write is applied, and readers that got the old value run again.
- An effect that always writes a signal it reads runs forever; nothing stops the loop.

## Credits

The graph algorithm (linked edges reused by a cursor, flag-based push and pull) follows [alien-signals](https://github.com/stackblitz/alien-signals) by Johnson Chu (MIT) and its port in Vue 3.6. The selector follows Solid's `createSelector`.
