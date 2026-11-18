# @fiorejs/signals

Signals for [fiorejs](https://github.com/vrtexe/fiore). Bind a signal to a property, attribute or child, and only that spot in the DOM updates when the signal changes. Nothing re-renders and nothing is diffed.

## Install

```sh
npm install fiorejs @fiorejs/signals
```

Signals carry the live-value method fiorejs looks for, so there is no setup step. The [signals reference](https://vrtexe.github.io/fiore/signals.html) on the documentation site covers the same ground as this README, with a page section per topic.

## Usage

```js
import { div, button, span } from 'fiorejs';
import { state, computed } from '@fiorejs/signals';

const count = state(0);
const double = computed(() => count.get() * 2);

document.body.append(
  div.attrs({ class: computed(() => (count.get() > 5 ? 'many' : 'few')) }).create([
    button.on({ click: () => count.update((n) => n + 1) }).create('+1'),
    span(count),
    span(computed(() => ` doubled: ${double.get()}`)),
  ]),
);
```

## Primitives

| Function | What it does |
| --- | --- |
| `state(value)` | A value with `get()`, `set(value)`, `update(fn)` and `mutate(fn)`. `update` sets the value `fn` returns, `mutate` changes the value in place. Reading it inside an effect, a computed or a binding subscribes to it. Setting an equal value (`Object.is`) does nothing. |
| `signal.computed(fn)` | A computed value derived from one signal's value: `count.computed((n) => n * 2)`. |
| `signal.map(render)`, `signal.for(key).map(render)` | A list that reuses the rows of items it has seen; a keyed list gives `render` a signal of the row's item; see [Lists](#lists). |
| `signal.if(then).else(otherwise)` | Shows `then(value)` while the value is truthy, built again when the value changes, and the other branch otherwise; see [Conditions](#conditions). |
| `signal.case(match, render).else(otherwise)` | Shows `render(value)` for the first case the value matches, built again when the value changes; see [Conditions](#conditions). |
| `signal.with(fn)` | Passes the signal to `fn` and returns its result, for reusable steps such as `todos.with(byId)`. |
| `computed(fn)` | A value derived from other signals. It is calculated on first read and again on the next read after an input changed. It keeps its value while an effect or binding reads it, also when that reader reruns for another reason. If `fn` throws, the error is kept like a value and thrown on every read until an input changes; a reader that catches it stays subscribed and recovers then. While nothing reads it inside an effect or binding, it does not stay subscribed to its inputs and is recalculated on every read. Effects and bindings that read it run again only when its value changed (`Object.is`) or its error changed, so `user.computed((u) => u.name)` does not update the DOM when another field of `user` changes. `fn` derives a value and must not set signals: `set`, `update` or `mutate` inside it throws. To correct a value, derive the corrected one (`computed(() => Math.min(page.get(), last.get()))`) or correct it where it is set. |
| `effect(fn)` | Runs `fn` now and again in the next flush after a signal it read changed; see [Scheduling](#scheduling). Returns a function that stops it. If `fn` returns a function, that function runs before the next run and when the effect stops. |
| `effect.pre(fn)`, `effect.post(fn)` | Like `effect`, but in the flush they run before, or after, the other effects and the bindings. The first run of `effect.post` waits for the next flush. |
| `flush()` | Runs the effects and bindings that wait for the flush now. |
| `tick()` | A promise that resolves after the waiting effects and bindings have run. |
| `root(fn)` | Runs `fn` with an owner of its own and returns a function that stops everything `fn` created; see [Cleanup](#cleanup). |
| `onCleanup(fn)` | Runs `fn` when the current owner stops: the root is stopped, the branch or list row is removed, or the effect runs again or stops. With no owner it never runs. Use it to remove document listeners, timers or nodes added outside the element. |
| `untrack(fn)` | Runs `fn` without subscribing to the signals it reads. What `fn` creates still belongs to the current owner and stops with it. |
| `read(value)` | Returns the current value of a signal, a getter function or a plain value. |
| `classList(entries)` | A computed value for `className` or the `class` attribute that lists classes by condition; see [Classes](#classes). |
| `selector(source)` | Returns `select(key)`, a signal that is true while `source` equals `key` (`Object.is`). When `source` changes, only the readers of the old and the new key run again, whatever the number of keys, so `classList({ danger: isSelected(row.id) })` on every row of a long list costs two updates per selection. A key is forgotten when nothing reads it. |
| `resource(source, fetcher)` | Loads a value asynchronously, like Solid's `createResource`; see [Loading data](#loading-data). |

## Scheduling

A write applies at once: after `count.set(1)`, `count.get()` and every computed that reads it return the new value. The effects and bindings that read it run again later, together, in one flush on a microtask. Several writes in a row cost one run of each reader, and an effect is never re-entered.

```js
count.set(1);
count.set(2);   // effects and bindings that read count run once, with 2
count.get();    // 2
```

A new effect or binding runs at once, so `div(count)` shows its value before the next line runs. A flush runs `effect.pre` effects first, then the other effects and the bindings in the order they were created, so an effect runs before the effects it created, and `effect.post` effects last. `effect.post` sees the DOM after the bindings have updated it, and its first run waits for the next flush, when the element it was created with is usually in the document. A write during the flush is handled in the same flush, which goes back to the first phase that has work.

The DOM therefore updates after the code that wrote the signal has finished. To read it right away, for example to focus or measure an element, call `flush()`; in async code, `await tick()` waits for the flush instead:

```js
submitted.set(true);
flush();
input.focus(); // the input that submitted shows is in the DOM now
```

Tests call `flush()` after their writes and before their assertions. `flush()` inside an effect does nothing, because the running flush handles everything before it ends.

An effect or binding that throws is stopped. The other effects of the flush still run, and at its end the flush throws the first error and reports the others with `reportError` (`console.error` where that does not exist). The error reaches the caller of `flush()`, rejects a waiting `tick()`, and is otherwise an uncaught error. An effect that runs more than 100 times in one flush, usually because it sets a signal it reads, is stopped with an error the same way. An error in the first run of a new effect, outside a flush, is reported.

## Loading data

`resource(source, fetcher)` calls `fetcher` with the value of `source` and loads again whenever `source` changes; while `source` gives `null`, `undefined` or `false`, nothing is loaded. `resource(fetcher)` loads once. The fetcher runs untracked and gets an `AbortSignal` that aborts when a newer load starts or the effect or list row the resource was created in goes away; the result of an older load is ignored.

The resource is a signal of the last loaded value, which it keeps while it reloads, with `loading` and `error` as signals, `refetch()` to load again and `mutate(value)` to set the value without loading. `error` is cleared when a new load starts and when the source becomes `null`, `undefined` or `false`. A failed load that nothing reads `error` of is also reported with `reportError`, so it does not go unnoticed.

```js
import { div } from 'fiorejs';
import { computed, resource, state } from '@fiorejs/signals';

const userId = state(1);
const user = resource(userId, (id, { signal }) => fetch(`/users/${id}`, { signal }).then((response) => response.json()));

div(computed(() => (user.error.get() ? 'Could not load' : user.loading.get() ? 'Loading…' : user.get().name)));
```

## Binding to the DOM

A signal is live: it binds to its current value, for example `span(count)`, `input.props({ value: name })` or `div.attrs({ class: computed(() => ...) })`. A function is not live; wherever it appears it is a callback, so a value derived from signals is written `computed(() => ...)`.

A value inside a nested prop binds too, for example `props({ style: { color: computed(() => ...) } })`. Bindings start when the element is created, so a builder used as a template binds once for every element it creates. A live child can return text, a node, a list of nodes or nothing.

A computed that builds elements owns the bindings and effects it creates: they stop before it recalculates and when nothing reads it any more, as they do inside an effect.

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

A component is a function that runs once, so pass signals to it, not their current values. `Reactive<T>` accepts a plain value or a signal, and `read()` unwraps both:

```ts
import { div } from 'fiorejs';
import { computed, read, type Reactive } from '@fiorejs/signals';

function Price(props: { amount: Reactive<number> }) {
  const label = computed(() => `${read(props.amount).toFixed(2)} CHF`);
  return div(label);
}

Price({ amount: 12 });
Price({ amount: total });
Price({ amount: computed(() => total.get() * 1.081) });
```

## Conditions

A component runs once, so `open.get() ? a : b` in markup is read once and never switches. `signal.if(then)` is the live version: it shows what `then` returns for the signal's value while that value is truthy, and nothing otherwise; `.else(otherwise)` adds the other branch.

```js
import { div, em } from 'fiorejs';
import { state } from '@fiorejs/signals';

const open = state(false);

div(open.if(() => Details()).else(() => em('closed')));
div(user.if((u) => Profile(u)).else(() => em('signed out')));
div(open.if(() => Details())); // nothing while closed
div(count.computed((n) => n > 10).if(() => em('many')));
```

Both branches are functions, so only the shown branch is built. The `then` branch gets the value and is built again whenever the value changes (`Object.is`), so `user.if((u) => Profile(u))` always shows the current user. To build it only when the truthiness flips, branch on a boolean: `count.computed(Boolean).if(...)` does not rebuild when `count` goes from 1 to 2. The `else` branch is built when it is shown and stays while the value stays falsy. When a branch is built again or another branch is shown, the bindings and effects the old branch created stop. A branch returns text, nodes or nothing; to show a live value in a branch, put it in an element: `.else(() => span(user.computed(...)))`.

For more than two branches, `signal.case(match, render)` shows what `render` returns while the value matches. A function is a test on the value; any other value is compared with `Object.is`. Chain more cases, and `.else(otherwise)` for the rest; the first case that matches wins, and without `.else` nothing shows when none matches. Like `.if`, a case's `render` gets the value and its branch is built again when the value changes, also while the same case keeps matching; to keep the branch while the value moves within a case, match on a derived value: `count.computed((n) => n > 10).case(true, ...)`.

```js
div(
  status
    .case('loading', () => Spinner())
    .case('error', () => em('Something went wrong'))
    .case((value) => value.startsWith('done'), () => Done())
    .else(() => null),
);
div(count.case(0, () => 'none').case((n) => n > 10, () => 'many').else(() => 'some'));
```

`.if(then)` is the case `Boolean`, so `.if(then).case(...)` works too. To match a function value itself, test it: `.case((value) => value === handler, ...)`.

## Lists

`signal.map(render)` renders a list from a signal of an array and reuses the rows of items it has seen before, so it only renders new items. The item itself is the key, so an item replaced by a copy gets a new row. `signal.for().map(render)` keys rows by `item.key`, and `signal.for((item) => item.id).map(render)` by what the function returns. In a keyed list `render` gets a signal of the item instead of the item: a new array that keeps a key with another object, such as an immutable update of one record, keeps the row and sets its item signal, so only the bindings that read it update and the row's nodes stay. A key that leaves the list and comes back gets a new row. `signal.map(render)` keys by the item itself, which therefore never changes for a row, so it passes the plain item. A key that appears more than once gets one row per occurrence; items without a `key` field all get the key `undefined` and are matched by position, and each such row's item signal follows the item at its position. A row can be a node or a fragment. When the order changes, only the rows that are out of place are moved, so a focused input in an unmoved row keeps its focus; browsers with `moveBefore` keep it in moved rows too. If `render` throws, the list keeps the rows it had, but stops updating like any binding that throws, and the error is thrown at the end of the flush.

A list is a live value, so pass it directly as the children. Each place it is bound keeps its own rows. Inside a computed child, give it its own element: `computed(() => (show.get() ? ul(todos.map(render)) : null))`; rows are then reused only while that computed does not recalculate. `render` gets the item's index at the time its row is created.

```js
import { ul, li } from 'fiorejs';
import { state } from '@fiorejs/signals';

const todos = state([{ id: 1, text: 'Write docs' }]);

ul(todos.for((todo) => todo.id).map((todo) => li.create(todo.computed((value) => value.text))));

todos.set([...todos.get(), { id: 2, text: 'Publish' }]);
todos.set(todos.get().map((todo) => (todo.id === 1 ? { ...todo, text: 'Write more docs' } : todo))); // row 1 updates in place
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

- when a computed child, an `if`/`case` branch or a list replaces content it built, the bindings inside the old content stop for good
- when a list drops an item, or the effect or computed around the list reruns, the bindings inside its rows stop for good
- content built outside any owner, for example `view = state(Home())`, is only paused when a live child replaces it and it leaves the document, like any removed element; build it in a computed or a root to stop it for good
- when an element is removed from the document, its bindings pause; if it is inserted again, they resume with the current values
- a live child among other children keeps its place between two comments, so it pauses and resumes correctly also when its nodes are moved, for example out of a JSX fragment; a live child that is the only child follows its element

Removal and insertion are detected with a `MutationObserver` on the document, so elements inside a shadow root are not paused.

`root(fn)` stops things when you decide. It runs `fn` with an owner of its own, so the effects, bindings, computeds and lists created in it, inserted or not, stop when you call the function it returns. A binding stopped this way stays stopped when its element is inserted again. A root belongs to no other owner, also when it is created inside an effect, so call its function yourself. If `fn` throws, what it created is stopped.

```js
const dispose = root(() => document.body.append(App()));
dispose(); // stops every binding and effect of the app
```

An element that is created but never inserted keeps its bindings for as long as its signals live, unless it was created in a root that is disposed. Once the element and its signals are no longer referenced, everything can be garbage-collected.

## Upgrading from 2.0

- Effects and bindings run in a flush on a microtask, not inside `set()`. Code that reads the DOM right after a write calls `flush()` first, or uses `effect.post`; tests call `flush()` before their assertions.
- An error of an effect or binding is thrown at the end of the flush instead of being reported, and the loop limit counts runs in one flush. A first run outside a flush still reports its error.
- New: `flush()`, `tick()`, `effect.pre`, `effect.post` and `root(fn)`.

## Limits

- A computed that returns a nested object, such as `style: computed(() => ({ color }))`, merges that object into the element on every update and never clears a key that disappears from it. Bind each key on its own instead: `style: { color: computed(() => ...) }`.
- Methods must be called on the signal: `count.set(1)` works, but a detached `const { set } = count; set(1)` does not. Pass `(value) => count.set(value)` where a function is needed.
- `resource().loading` and `resource().error` are signals you can set at runtime, although the types describe them as read-only; setting them yourself confuses the resource.
- A list or condition that throws while it updates keeps the nodes it had and stops updating, like any binding that throws; the update is not rolled back.
- A live property whose value is an object that contains more live values (`style: computed(() => ({ color: computed(...) }))`) binds each level one call deeper, so thousands of such levels can overflow the stack. Plain nested objects and arrays have no such limit.
- Two copies of `@fiorejs/signals` on one page bind each other's signals, but a `computed` or `effect` only tracks signals from its own copy. Two copies of fiorejs's type declarations can also make TypeScript reject a signal as a live value, because the `LIVE` symbol type differs between the copies; make sure the project resolves `fiorejs` once.
- `refetch()` on a resource whose effect or list row has gone away still starts a load; call it only while the resource is in use.
