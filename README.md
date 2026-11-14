# @fiorejs/signals

Signals for [fiorejs](https://github.com/vrtexe/fiore). Bind a signal to a property, attribute or child, and only that spot in the DOM updates when the signal changes. Nothing re-renders and nothing is diffed.

## Install

```sh
npm install fiorejs @fiorejs/signals
```

Importing the package registers it with fiorejs, so there is no setup step.

## Usage

```js
import { div, button, span } from 'fiorejs';
import { state, computed } from '@fiorejs/signals';

const count = state(0);
const double = computed(() => count.get() * 2);

document.body.append(
  div({
    attributes: { class: () => (count.get() > 5 ? 'many' : 'few') },
    children: [
      button({ event: { click: () => count.set(count.get() + 1) }, children: '+1' }),
      span({ children: count }),
      span({ children: () => ` doubled: ${double.get()}` }),
    ],
  }),
);
```

## Primitives

| Function | What it does |
| --- | --- |
| `state(value)` | A value with `get()`, `set(value)`, `update(fn)` and `mutate(fn)`. `update` sets the value `fn` returns, `mutate` changes the value in place. Reading it inside an effect, a computed or a binding subscribes to it. Setting an equal value (`Object.is`) does nothing. |
| `computed(fn)` | A value derived from other signals. It is calculated on first read and again on the next read after an input changed. |
| `effect(fn)` | Runs `fn` now and whenever a signal it read changes. Returns a function that stops it. If `fn` returns a function, that function runs before the next run and when the effect stops. |
| `untrack(fn)` | Runs `fn` without subscribing to the signals it reads. |
| `read(value)` | Returns the current value of a signal, a getter function or a plain value. |
| `each(items, render, key)` | Renders a list and reuses the nodes of items whose key is unchanged. |

Effects run synchronously when a signal is set.

## Binding to the DOM

A value is live when it is a signal or a function:

- a signal binds to its current value: `children: count`, `props: { value: name }`
- a function is called inside an effect and binds to its result: `attributes: { class: () => ... }`, `children: () => ...`

Functions in `event`, and properties whose name starts with `on`, are listeners and never bindings. A live child can return text, a node, a list of nodes or nothing.

## Components

A component is a function that runs once, so pass signals or getters to it, not their current values. `Reactive<T>` accepts all three forms, and `read()` unwraps them:

```ts
import { div } from 'fiorejs';
import { computed, read, type Reactive } from '@fiorejs/signals';

function Price(props: { amount: Reactive<number> }) {
  const label = computed(() => `${read(props.amount).toFixed(2)} CHF`);
  return div({ children: label });
}

Price({ amount: 12 });
Price({ amount: total });
Price({ amount: () => total.get() * 1.081 });
```

## Lists

`each` reuses the node of every item whose key it has seen before and only renders new items. Without a key, the item itself is the key.

```js
import { ul, li } from 'fiorejs';
import { each, state } from '@fiorejs/signals';

const todos = state([{ id: 1, text: 'Write docs' }]);

ul({ children: each(todos, (todo) => li({ children: todo.text }), (todo) => todo.id) });

todos.set([...todos.get(), { id: 2, text: 'Publish' }]);
```

Lists of a few thousand rows are fine: in Chromium, 1,000 rows with three bound inputs each render in about 40 ms including layout, and a change to one row or to the list takes under a millisecond. For much longer lists the number of DOM nodes becomes the limit, so paginate or render only the visible rows.

## Arrays and objects

A signal tracks its value, not what is inside it. Replace arrays and objects instead of changing them:

```js
todos.set([...todos.get(), next]);          // updates
todos.get().push(next);                     // does not update
user.set({ ...user.get(), name: 'Grace' }); // updates
```

Copying is cheap for most lists, because only references are copied. For very large arrays or objects, `mutate(fn)` changes the value in place and notifies even though it is still the same array; the return value of `fn` is ignored:

```js
todos.mutate((list) => list.push(next));
```

For deeply nested data, give the fields that change on their own their own signal.

## Global state

A signal created at the top of a module is shared by everything that imports it:

```js
// store.js
export const user = state(null);
```

## Cleanup

Bindings are stopped automatically:

- when a live child replaces its content, the bindings inside the old content stop
- when `each` drops an item, the bindings inside its row stop
- when an element that was in the document is removed, its bindings stop, detected with a `MutationObserver`

An element that is created but never inserted keeps its bindings for as long as its signals live.

## Limits

- Functions passed as properties are treated as bindings, so a custom element property that expects a function has to be set in code.
- There is no `batch()` yet: every `set()` runs its effects immediately.
