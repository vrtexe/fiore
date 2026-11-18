# fiorejs playground

The playground is a set of interactive pages that run the working tree's `lib/` (fiorejs) and `packages/signals/src` (`@fiorejs/signals`) directly in the browser, with no build step. Use it to see how elements are built, how live values reach the DOM, and how signals, lists, lifecycle and async loading behave. Every code change in the repository shows after a reload.

## Run it

From the repository root:

```sh
npm start
```

Then open <http://127.0.0.1:3100/demo/>. The page uses an import map, so `import { div } from 'fiorejs'` and `import { state } from '@fiorejs/signals'` resolve to the files in this repository.

Each section on the page is one flow. Each card shows the element under test in a dashed box, the buttons that change it, and a log or a live view of its markup. In the markup views, `⟨marker⟩` stands for the empty comment nodes that fiorejs uses to keep track of live children.

The code of every flow is in `demo/flows/`, one file per section. The files are short and commented, so read them next to the page.

## The flows

### 1. Builders and tags (`flows/builders.js`)

A tag such as `div` or `span` is a function with builder methods. This flow shows the three ways to call one:

```js
span('Plain call: a string is the children');
span({ props: { title: 'x' }, attrs: { 'data-kind': 'data object' }, children: 'Data object' });
span.props({ title: 'x' }).attrs({ 'data-kind': 'builder' }).create('Builder chain');
```

What to look at:

- **Templates.** A builder never changes; every method returns a new one. `button.with(pill)` applies a reusable modifier, and the result can create many elements.
- **Listeners.** `on({ click: fn })` adds a listener; `on({ click: { handler, options: { once: true } } })` passes options. Click the button twice and compare the log lines. `also(fn)` runs with the created element before it is in the document.
- **Children.** `null`, `undefined`, `true` and `false` are skipped, so `isAdmin && li('…')` works, and arrays are flattened at any depth, so `[li('a'), items.map(row)]` works. Open the markup view to see the flat result.
- **Props and attributes.** `props` sets JavaScript properties (`value` here), `attrs` calls `setAttribute`. An inline handler attribute such as `onclick: 'alert(1)'` is never set, because the browser would run its text as script; the button shows that the attribute is missing.
- **Namespaces.** `svg.circle` from `fiorejs/svg` creates SVG elements; the card prints the element's namespace.

### 2. Signals (`flows/signals.js`)

`state(value)` holds a value, `computed(fn)` derives one (lazily, and caches it), and `effect(fn)` runs again when a signal it read changes. A signal passed as a child, prop or attribute updates exactly that spot in the DOM.

```js
const count = state(0);
const double = computed(() => count.get() * 2);
const label = count.computed((value) => `${value} clicks`); // derived from one signal
div([strong(label), ' · double: ', span(double)]);
```

What to look at:

- **Run counts.** The log shows each effect run and how often `double` recalculated. It recalculates only when `count` changed and something reads it.
- **untrack.** The effect reads `a` normally and `b` through `untrack`; changing `b` does not rerun it.
- **A computed cannot set a signal.** The button creates a computed that tries to clamp `page` by writing it, and the log shows the error. The working alternative on the left derives the clamped value instead: `computed(() => Math.min(page.get(), last.get()))`.
- **classList.** Classes switch on and off from a boolean, a signal or a getter.
- **Two-way input.** `input.props({ value: name }).on({ input: … })` keeps the field and the greeting in sync.

### 3. Scheduling (`flows/scheduling.js`)

A write applies at once, but effects and bindings rerun together in one flush on a microtask.

- **Batching.** **Set three times** writes `count` three times in one click; the log shows one effect run, with the final value.
- **flush().** **Set "two"** logs the DOM right after the write and still sees the old text, because the flush has not run yet. **Set "three", then flush()** calls `flush()` first and sees the new text.
- **effect.pre and effect.post.** Both read the box's text. `effect.pre` runs before the bindings of the flush and sees the old size; `effect.post` runs after them and sees the new one.
- **root().** **Create a widget in a root** builds a widget whose effect logs every second. **Dispose the root** stops it: the log and the widget stop updating.

### 4. Live children (`flows/live-children.js`)

A live value as a child keeps its own place in the parent. Open the markup views:

- **Only child versus siblings.** `div(text)` has one text node and no markers: the element itself bounds the child. `div(['[', text, ']'])` keeps the live text between two `⟨marker⟩` comments, because it has siblings.
- **Text, node, list, nested, nothing.** One live child switches between a string, an element, a list of nodes, nested arrays and `null`. Only the nodes between its markers change.
- **Robust against outside DOM changes.** Press `normalize()` (it merges adjacent text nodes), then **Simulate translation** (it replaces the live text node with `<font>`, as Chrome's page translation does), then **Update the value** (it calls `flush()` so the log can read the DOM right away). The new value still appears, because fiorejs reads the nodes between the markers instead of remembering them.
- **if / else.** `count.if(() => …).else(() => …)` shows a branch by truthiness. Press **count + 1** several times: the branch is built once; press **count = 0** and then **count + 1**: it is built again, because the truthiness flipped.
- **case.** `level.case(0, …).case((n) => n > 3, …).else(…)` shows the branch of the first case that matches: **none** at 0, **a few** from 1 to 3, **many** above 3.
- **A live child inside a fragment.** The fragment's nodes are moved into another element, and the live child inside keeps updating.

### 5. Lists (`flows/lists.js`)

`signal.map(render)` renders a list from a signal of an array and keeps the rows of items it has seen, so only new items are rendered:

```js
const todos = state([todo('milk'), todo('eggs')]);
ul(todos.map((item) => li(item.text)));
```

What to look at:

- **Which rows render.** The log shows a line for every row that is rendered. Add, reverse, shuffle and clear: existing rows are never rendered again.
- **Rows are moved, not rebuilt.** Type in or focus the input of a row, then press **Reverse** or **Shuffle**. The row keeps its input value, because only the rows out of place are moved.
- **Fields in signals.** Each todo keeps `done` in a signal, so checking a box updates only that row's class and the "left" count.
- **for(key) and copies.** The second card keys rows by `id`. **Replace with an edited copy** changes the data, and the rows update in place: a keyed row gets a signal of its item, and a copy with the same key keeps the row and sets that signal, so the row is not rebuilt.

### 6. Lifecycle (`flows/lifecycle.js`)

Bindings follow the document, without any component tree:

- **Pause and resume.** A live text updates every second. **Remove from the page**, wait a few seconds, then **Insert again**: while it was out of the document, its binding did not run, and on insert it shows the current tick at once. **Status** prints how often the binding has run.
- **Ownership of a computed child.** The child is a computed that creates an inner effect. The log shows the effect's runs and cleanups; **Toggle** hides the child, and its inner effect stops for good.

### 7. Async: resource (`flows/resource.js`)

`resource(source, fetcher)` loads a value whenever `source` changes. The fake server answers after a random delay and fails for user 5.

What to look at:

- **Next three quickly.** Three writes in one click would share one flush and start one load, so the button calls `flush()` after each: three loads start, the older ones are aborted (see the log), and only the last result is shown.
- **loading and error.** Both are signals; the card shows them next to the name. Go to user 5 to see an error.
- **Refetch** loads the current user again; **Rename locally** sets the value with `mutate` without loading.

### 8. The live protocol (`flows/live-protocol.js`)

fiorejs binds any value that has a method under `Symbol.for('fiorejs.live')`, exported as `LIVE`:

```js
class Clock {
  [LIVE](apply, context) {
    apply(new Date().toLocaleTimeString());
    setInterval(() => apply(new Date().toLocaleTimeString()), 1000);
  }
}
span(new Clock());
```

What to look at:

- **A custom live value.** The clock is not a signal; it binds as a child and as an attribute, and the log shows the context each binding received.
- **A live handler prop.** `button.props({ onclick: handler })` with a signal that holds a function: switching the signal switches the click handler.
- **Functions are not live.** A plain function given as a child is shown as its source text. Wrap a getter in `computed` to make it live.

## Changing the code

Edit `lib/` or `packages/signals/src/` and reload the page; there is nothing to build. To try an idea, add a card to one of the flow files, or a new file in `demo/flows/` and register it in `demo/main.js`.

`npm run test:e2e` runs the flows above as browser tests (`test/e2e/playground.test.js`) in Chromium, Firefox and WebKit, with its own static server. Install the browsers once with `npx playwright install chromium firefox webkit`; a browser that is not installed is skipped. When you change what a card does, update its test.
