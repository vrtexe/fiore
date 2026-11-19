<p>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/vrtexe/fiore/main/docs/assets/brand/fiore-symbol-green.svg" />
    <img src="https://raw.githubusercontent.com/vrtexe/fiore/main/docs/assets/brand/fiore-symbol-dark.svg" alt="fiore logo" width="72" height="72" />
  </picture>
</p>

# fiore

Create HTML, SVG and MathML elements in JavaScript with one function per tag.

[![npm version](https://img.shields.io/npm/v/fiorejs.svg?style=flat-square)](https://www.npmjs.com/package/fiorejs)
[![types](https://img.shields.io/npm/types/fiorejs.svg?style=flat-square)](https://github.com/vrtexe/fiore/blob/main/lib/html.d.ts)
[![license](https://img.shields.io/npm/l/fiorejs.svg?style=flat-square)](https://github.com/vrtexe/fiore/blob/main/LICENSE.md)
[![issues](https://img.shields.io/github/issues/vrtexe/fiore.svg?style=flat-square)](https://github.com/vrtexe/fiore/issues)

## Why this library

- **Native elements, not wrappers.** Every tag calls `document.createElement` (or `createElementNS` for SVG and MathML) and returns that node, so there is nothing to unwrap before it goes into the DOM.
- **Props and attributes stay apart.** `props` sets JavaScript properties and `attrs` sets attributes, so you always know which one you set.
- **A builder per tag.** `div.props(…).attrs(…).on(…).create(children)` records settings and creates the element at `.create()`; a builder is immutable, so it doubles as a template.
- **A fixed order.** Props, attributes, children and listeners are applied in that order, whatever the order of the calls; only `value`, `selectedIndex` and `checked` wait until after the children.
- **Typed per tag.** Every tag returns the exact element type, such as `HTMLInputElement`, and checks props, attributes and listeners against that element, for HTML, SVG and MathML.
- **No dependencies, no build step needed.** The package is plain ES modules with TypeScript declarations.

## Install

```sh
npm install fiorejs
```

> Fiore was published as `html-dom-js` up to version 1.1.2. Version 2 changes the API; see [Upgrading from 1.x](#upgrading-from-1x).

## Usage

```js
import { button, div, input, label } from 'fiorejs';

document.body.append(
  div
    .props({ className: 'card', style: { padding: '16px' } })
    .attrs({ 'aria-label': 'Sign up' })
    .create([
      label.props({ htmlFor: 'email' }).create('Email'),
      input.props({ id: 'email', type: 'email', placeholder: 'you@example.com', required: true }).create(),
      button
        .props({ type: 'button' })
        .on({ click: (event) => console.log('clicked', event.currentTarget) })
        .create('Sign up'),
    ]),
);
```

Every tag is a function with builder methods:

| Method | Takes | Repeated calls |
| --- | --- | --- |
| `props(map)` | JavaScript properties of the element, such as `className`, `value` or `style`. `undefined` leaves the element's property unchanged, but a later `undefined` replaces an earlier value of the same builder. | Combine: later keys win, so a later `style` object replaces an earlier one. A nested object such as `style` is merged into the element after the other keys of its map. |
| `attrs(map)` | Attributes, set with [`setAttribute`](https://developer.mozilla.org/en-US/docs/Web/API/Element/setAttribute). Every name that is `on` followed by letters only, such as `onclick` or `onunload`, in any case, is ignored, so no handler string is ever run; a hyphenated name such as `on-tap` is set. Never take attribute names from untrusted data. | Merge: later keys win, and `null` removes an earlier value. |
| `on(map)` | Listeners: `{ click: fn }` or `{ click: { handler, options } }`. | Add listeners; they never replace each other. |
| `with(fn)` | A function that gets the builder and returns a builder. | Each call applies its function. |
| `also(fn)` | A function that gets the created element, after the listeners. The element is not in the document yet, so focusing or measuring does not work there. | Add callbacks, run in order. |
| `create(children)` | The children, like the `children` key: a node, a string, a number, or an array of these. Creates the element and returns it. | |

Children are nodes, strings, numbers, bigints or arrays of these, nested as deep as you like, so `[title, items.map(row)]` works. `null`, `undefined`, `true` and `false` are skipped, so `user.isAdmin && badge()` works.

Each method returns a new builder and leaves the old one unchanged, and the top level of each map is copied when you call the method; nested objects such as `style` are used as they are when the element is created. A builder can therefore serve as a template:

```js
const card = div.props({ className: 'card' }).on({ click: select });

card.create(h2('A'));
card.attrs({ 'aria-label': 'B' }).create(h2('B'));
```

`with` applies reusable settings, left to right, or a condition:

```js
const shadow = (b) => b.props({ style: { boxShadow: '0 1px 4px #0003' } });

div.with(shadow).with((b) => (isAdmin ? b.attrs({ 'data-admin': '' }) : b)).create('Settings');
```

In TypeScript, type a modifier that works on every HTML tag as `HTMLModifier` (`SVGModifier` for SVG); it keeps the type of the tag it is used on:

```ts
import { button, div, type HTMLModifier } from 'fiorejs';

const card: HTMLModifier = (b) => b.props({ className: 'card' });

div.with(card).create(); // HTMLDivElement
button.with(card).props({ type: 'submit' }).create('Save'); // HTMLButtonElement
```

### Plain calls

A tag can also be called directly. A plain object is the data object, with the same names as the builder; anything else is the children:

```js
p();
p('Hello');
p([strong('Hi'), ' there']);
p({ props: { className: 'lead' }, attrs: { title: 'Intro' }, on: { click: select }, children: 'Hello' });
```

Because a plain object is read as the data object, pass a value that does not come from your own code, such as parsed JSON, storage or a message, through `.create(value)` or `{ children: value }`. Otherwise an object like `{ "props": { "innerHTML": "…" } }` sets properties instead of showing text.

`value`, `selectedIndex` and `checked` are assigned after the attributes and children, so they can refer to them:

```js
select.props({ value: 'M' }).create([option('S'), option('M')]);
input.props({ type: 'range', value: '150' }).attrs({ max: '200' }).create();
```

### Elements by name

`element(name)` returns the tag of any element by name, with the same methods as the named export: `element('div').props(…).create()` or `element('div')(data)`. `fiorejs/svg` and `fiorejs/math` export their own `element`.

Import styles:

```js
// One function per tag:
import { element, div } from 'fiorejs';

// Or one object per namespace:
import html from 'fiorejs/html';
import svg from 'fiorejs/svg';
import math from 'fiorejs/math';
```

`fiorejs/global` exports the same objects by name, together with `deprecatedHtml`: `import { html, svg, math, deprecatedHtml } from 'fiorejs/global'`.

The [MDN](https://developer.mozilla.org/en-US/docs/Web/API) documentation of each element applies to its props and attributes. TypeScript declarations are included.

### Fragments

`fragment(children)` returns a `DocumentFragment` of the children, for a group of nodes without a wrapping element. It takes the same children as a tag, live values included; a live child of a fragment keeps updating after the fragment is inserted.

```js
import { fragment, dl, dt, dd } from 'fiorejs';

dl.create(terms.map((term) => fragment([dt(term.name), dd(term.text)])));
```

### Events

Each element accepts the events of its own event map, so `body` takes window events such as `popstate`, and `video` takes media events such as `encrypted`. In a listener, `this` and `event.currentTarget` are typed as the element.

```js
import { input } from 'fiorejs';

input
  .on({
    input: (event) => console.log(event.currentTarget.value),
    keydown: { handler: (event) => console.log(event.key), options: { once: true } },
  })
  .create();
```

Custom event names that contain a hyphen are accepted on every element and typed as `CustomEvent`. Annotate the parameter to type its `detail`:

```ts
div.on({ 'cart-add': (event: CustomEvent<{ sku: string }>) => console.log(event.detail.sku) }).create();
```

For a custom event name without a hyphen, add it to the global event map:

```ts
declare global {
  interface HTMLElementEventMap {
    itemselected: CustomEvent<{ id: number }>;
  }
}
```

### Attribute values

`null`, `undefined` and `false` leave an attribute out. Every other value, including `0` and `''`, is passed to `setAttribute`, which converts it to a string; Trusted Types objects are passed through unchanged. Values are not checked: a `javascript:` URL in `href` or `src` runs when it is followed, so check the scheme of a URL that comes from untrusted data. `aria-*` and `data-*` attributes, and the enumerated attributes `contenteditable`, `draggable` and `spellcheck`, keep `false` as the string `"false"`.

Versions before 1.2.0 skipped every falsy value, including `0` and `''`. Use `null` or `false` to leave an attribute out.

### Live values

A value is live when it has a method under `Symbol.for('fiorejs.live')`, exported as `LIVE`. fiorejs calls that method with an `apply` function and a context; the value calls `apply` with its current value now and whenever the value changes. Signals from [`@fiorejs/signals`](packages/signals) are live values, and any other observable can become one:

```js
import { LIVE, span } from 'fiorejs';

class Observed {
  constructor(source) {
    this.source = source;
  }

  [LIVE](apply, context) {
    apply(this.source.current);
    this.source.subscribe(apply);
  }
}

span(new Observed(clock));
```

`context.kind` is `'property'`, `'attribute'` or `'child'`, and `context.element` is the element being built. Properties and attributes come with `context.name`; properties also carry `context.path`, the full key path such as `['style', 'color']`. A child comes with `context.anchor`, a node that stays in the document as long as the child does. A child that is the only item of `children` fills the element, and its anchor is the element; in a `fragment()` it keeps the comments. Any other child lives between two empty comments, and its anchor is the first one; the comments move with its nodes, for example out of a fragment, and show in `childNodes` and `innerHTML`, but not in `children`, `textContent` or CSS selectors. An only child belongs to its element: if code moves its nodes to another parent, later updates still go to the element, and nodes that other code adds to the element, for example in `also()`, are removed at its next update; give it a sibling in both cases.

Only values with a `[LIVE]` method are live. A plain function is a callback, never a getter, in props, attributes and children alike; strings, numbers, booleans, nodes and plain objects without `[LIVE]` are static. Attributes named `on` followed by letters only, such as `onclick` in any case, are never set or bound, because the browser may run their text as script; hyphenated names such as `on-tap` are. As a prop, a handler can be a live value whose value is a function: `props: { onclick: handler }` swaps the handler when `handler` changes. Listeners belong in `on`. A live child that has not called `apply` yet keeps an empty place until it does. A node that one live child places can be taken over by another live child, which then owns it; a node from a live child that is passed as a static child of another element is moved there without its live child being told, so give each node one owner.

The key comes from `Symbol.for`, so live values also work when a page loads two copies of fiorejs. The `LiveValue`, `Live` and `BindContext` types are exported from `fiorejs`; a value whose `[LIVE]` method passes a `T` to `apply` fits `Live<T>`, so props, attributes and children check the type of a live value like that of a plain one.

## Upgrading from 1.x

Version 2 renames two keys of the data object and adds the builder; everything else works as before.

| 1.x | 2.x |
| --- | --- |
| `div({ attributes: { … } })` | `div({ attrs: { … } })` or `div.attrs({ … }).create()` |
| `div({ event: { click } })` | `div({ on: { click } })` or `div.on({ click }).create()` |
| `div({ children: 'Hi' })` | still works, or `div.create(value)`; `div('Hi')` is fine for literal text, see [Plain calls](#plain-calls) |
| `element('div', data)` | `element('div')(data)` |

Plugins are gone in version 2, and so is `use()`. A value is live when it carries a `[LIVE]` method instead, see [Live values](#live-values); signals from `@fiorejs/signals` 2.0.0 do. A bare function is no longer live: wrap a getter in `computed(() => …)`. A `computed` may no longer set signals; doing so throws. In `@fiorejs/signals`, `each(todos, row, key)` becomes `todos.for(key).map(row)`, and `each(todos, row)` becomes `todos.map(row)`. A live child that has siblings now sits between two empty comments, which show in `childNodes` and `innerHTML`.

## Packages

This repository also holds the packages that build on fiorejs, each in its own folder under `packages/`:

- [`@fiorejs/signals`](packages/signals): signals that bind state to props, attributes and children.
- [`@fiorejs/jsx`](packages/jsx): a JSX runtime that returns real DOM nodes.
- [`@fiorejs/create`](packages/create): `npm create @fiorejs` scaffolds an app.

## Releases

Release notes are on the [GitHub releases page](https://github.com/vrtexe/fiore/releases). A release tagged `1.2.3` publishes fiorejs; a release tagged `<folder>@<version>`, such as `jsx@0.1.0`, publishes the package in that folder.

## License

[MIT](https://github.com/vrtexe/fiore/blob/main/LICENSE.md)
