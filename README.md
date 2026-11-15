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
| `computed(fn)` | A value derived from other signals. It is calculated on first read and again on the next read after an input changed. It keeps its value while an effect or binding reads it, also when that reader reruns for another reason. If `fn` throws, the error is kept like a value and thrown on every read until an input changes; readers stay subscribed and recover then. While nothing reads it inside an effect or binding, it does not stay subscribed to its inputs and is recalculated on every read. |
| `effect(fn)` | Runs `fn` now and whenever a signal it read changes. Returns a function that stops it. If `fn` returns a function, that function runs before the next run and when the effect stops. |
| `untrack(fn)` | Runs `fn` without subscribing to the signals it reads. |
| `read(value)` | Returns the current value of a signal, a getter function or a plain value. |
| `each(items, render, key)` | Renders a list and reuses the nodes of items whose key is unchanged. `render` gets the item's index at the time its row is created. |

Effects run synchronously when a signal is set. If an effect throws, the other effects of that update still run, and the first error is thrown from `set()`. If an effect's first run throws, the effect is stopped. A cleanup or an inner effect that throws does not stop the effect around it; its error is thrown after the run. An effect that runs more than 100 times in one update, usually because it sets a signal it reads, stops the update with an error.

## Binding to the DOM

A value is live when it is a signal or a function:

- a signal binds to its current value: `children: count`, `props: { value: name }`
- a function is called inside an effect and binds to its result: `attributes: { class: () => ... }`, `children: () => ...`

Functions in `event`, and properties or attributes whose name starts with `on` in any case, are listeners and never bindings. A live child can return text, a node, a list of nodes or nothing.

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

`each` reuses the node of every item whose key it has seen before and only renders new items. Without a key, the item itself is the key; a key that appears more than once gets one row per occurrence. When the order changes, only the rows that are out of place are moved, so a focused input in an unmoved row keeps its focus; browsers with `moveBefore` keep it in moved rows too. If `render` throws, the list keeps the rows it had.

`each(...)` returns a getter, so put it directly into `children`. Inside a live child, call it: `() => (show.get() ? each(items, render)() : null)`; rows are then reused only while that live child does not rerun.

```js
import { ul, li } from 'fiorejs';
import { each, state } from '@fiorejs/signals';

const todos = state([{ id: 1, text: 'Write docs' }]);

ul({ children: each(todos, (todo) => li({ children: todo.text }), (todo) => todo.id) });

todos.set([...todos.get(), { id: 2, text: 'Publish' }]);
```

Lists of a few thousand rows are fine: in Chromium, 1,000 rows with three bound inputs each render in about 40 ms including layout, a change to one row takes well under a millisecond, and adding, removing or swapping rows moves only the rows involved. For much longer lists the number of DOM nodes becomes the limit, so paginate or render only the visible rows.

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

- when a live child replaces its content, the bindings inside the old content stop for good
- when `each` drops an item, or the effect around the list reruns, the bindings inside its rows stop for good
- when an element is removed from the document, its bindings pause; if it is inserted again, they resume with the current values
- a live child follows its own nodes, so it pauses and resumes correctly also when it was built in one place and moved, for example out of a JSX fragment

Removal and insertion are detected with a `MutationObserver` on the document, so elements inside a shadow root are not paused.

An element that is created but never inserted keeps its bindings for as long as its signals live. Bindings are held weakly, so once the element and its signals are no longer referenced, everything can be garbage-collected.

## Limits

- Functions passed as properties are treated as bindings, so a custom element property that expects a function has to be set in code.
- There is no `batch()` yet: every `set()` runs its effects immediately.
