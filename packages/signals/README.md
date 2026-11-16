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
  div.attrs({ class: () => (count.get() > 5 ? 'many' : 'few') }).create([
    button.on({ click: () => count.update((n) => n + 1) }).create('+1'),
    span(count),
    span(() => ` doubled: ${double.get()}`),
  ]),
);
```

## Primitives

| Function | What it does |
| --- | --- |
| `state(value)` | A value with `get()`, `set(value)`, `update(fn)` and `mutate(fn)`. `update` sets the value `fn` returns, `mutate` changes the value in place. Reading it inside an effect, a computed or a binding subscribes to it. Setting an equal value (`Object.is`) does nothing. |
| `computed(fn)` | A value derived from other signals. It is calculated on first read and again on the next read after an input changed. It keeps its value while an effect or binding reads it, also when that reader reruns for another reason. If `fn` throws, the error is kept like a value and thrown on every read until an input changes; a reader that catches it stays subscribed and recovers then. While nothing reads it inside an effect or binding, it does not stay subscribed to its inputs and is recalculated on every read. |
| `effect(fn)` | Runs `fn` now and whenever a signal it read changes. Returns a function that stops it. If `fn` returns a function, that function runs before the next run and when the effect stops. |
| `untrack(fn)` | Runs `fn` without subscribing to the signals it reads. |
| `read(value)` | Returns the current value of a signal, a getter function or a plain value. |
| `classList(entries)` | A getter for `className` or the `class` attribute that lists classes by condition; see [Classes](#classes). |
| `resource(source, fetcher)` | Loads a value asynchronously, like Solid's `createResource`; see [Loading data](#loading-data). |
| `each(items, render, key)` | Renders a list and reuses the nodes of items whose key is unchanged. `render` gets the item's index at the time its row is created. |

Setting a signal runs its effects before `set()` returns. A signal set while an effect runs, including its first run, is handled after that run has finished, so an effect is never re-entered.

An effect or binding that throws is stopped, and its error is reported with `reportError` (`console.error` where that does not exist); the other effects keep running, and `set()` and `effect()` never throw because of an effect. A cleanup that throws is reported and does not stop its effect. An effect that runs more than 100 times in one update, usually because it sets a signal it reads, is reported and stopped the same way.

## Loading data

`resource(source, fetcher)` calls `fetcher` with the value of `source` and loads again whenever `source` changes; while `source` gives `null`, `undefined` or `false`, nothing is loaded. `resource(fetcher)` loads once. The fetcher runs untracked and gets an `AbortSignal` that aborts when a newer load starts or the effect or list row the resource was created in goes away; the result of an older load is ignored.

The resource is a signal of the last loaded value, which it keeps while it reloads, with `loading` and `error` as signals, `refetch()` to load again and `mutate(value)` to set the value without loading. `error` is cleared when a new load starts.

```js
import { div } from 'fiorejs';
import { resource, state } from '@fiorejs/signals';

const userId = state(1);
const user = resource(userId, (id, { signal }) => fetch(`/users/${id}`, { signal }).then((response) => response.json()));

div(() => (user.error.get() ? 'Could not load' : user.loading.get() ? 'Loading…' : user.get().name));
```

## Binding to the DOM

A value is live when it is a signal or a function:

- a signal binds to its current value: `span(count)`, `input.props({ value: name })`
- a function is called inside an effect and binds to its result: `div.attrs({ class: () => ... })`, `div(() => ...)`

A value inside a nested prop binds too, for example `props({ style: { color: () => ... } })`. Bindings start when the element is created, so a builder used as a template binds once for every element it creates.

Functions in `on`, and functions under a property or attribute name that starts with `on` in any case, such as a custom element's `onConfirm`, are callbacks and never bindings; a signal under such a name still binds. A live child can return text, a node, a list of nodes or nothing.

## Classes

`classList` builds the class text from strings, which are always on, and objects whose keys are on while their value is truthy. A value can be a boolean, a signal or a getter:

```js
import { div } from 'fiorejs';
import { circle } from 'fiorejs/svg';
import { classList, state } from '@fiorejs/signals';

const active = state(false);
const enabled = state(true);

div.props({ className: classList(['card', { active, disabled: () => !enabled.get() }]) }).create();
circle.attrs({ class: classList({ hot: active }) }).create();
```

A condition that is derived from a signal needs a getter or a `computed`: `{ disabled: !enabled.get() }` is evaluated once, when the object is created, and never updates.

## Components

A component is a function that runs once, so pass signals or getters to it, not their current values. `Reactive<T>` accepts all three forms, and `read()` unwraps them:

```ts
import { div } from 'fiorejs';
import { computed, read, type Reactive } from '@fiorejs/signals';

function Price(props: { amount: Reactive<number> }) {
  const label = computed(() => `${read(props.amount).toFixed(2)} CHF`);
  return div(label);
}

Price({ amount: 12 });
Price({ amount: total });
Price({ amount: () => total.get() * 1.081 });
```

## Lists

`each` reuses the node of every item whose key it has seen before and only renders new items. Without a key, the item itself is the key; a key that appears more than once gets one row per occurrence. When the order changes, only the rows that are out of place are moved, so a focused input in an unmoved row keeps its focus; browsers with `moveBefore` keep it in moved rows too. If `render` throws, the error is reported and the list keeps the rows it had, but stops updating like any binding that throws.

`each(...)` returns a getter, so pass it directly as the children. Inside a live child, call it: `() => (show.get() ? each(items, render)() : null)`; rows are then reused only while that live child does not rerun.

```js
import { ul, li } from 'fiorejs';
import { each, state } from '@fiorejs/signals';

const todos = state([{ id: 1, text: 'Write docs' }]);

ul(each(todos, (todo) => li.create(todo.text), (todo) => todo.id));

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
- a live child among other children keeps its place between two comments, so it pauses and resumes correctly also when its nodes are moved, for example out of a JSX fragment; a live child that is the only child follows its element

Removal and insertion are detected with a `MutationObserver` on the document, so elements inside a shadow root are not paused.

An element that is created but never inserted keeps its bindings for as long as its signals live. Bindings are held weakly, so once the element and its signals are no longer referenced, everything can be garbage-collected.

## Limits

- Functions passed as properties are treated as bindings unless the name starts with `on`, so a custom element property that expects a function under another name has to be set in code, for example in `also()`.
- A getter that returns a nested object, such as `style: () => ({ color })`, merges that object into the element on every update and never clears a key that disappears from it. Bind each key on its own instead: `style: { color: () => ... }`.
- There is no `batch()` yet: outside an effect, every `set()` runs its effects immediately.
- `refetch()` on a resource whose effect or list row has gone away still starts a load; call it only while the resource is in use.
