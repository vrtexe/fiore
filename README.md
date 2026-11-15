# fiore

Create HTML, SVG and MathML elements in JavaScript with one function per tag.

[![npm version](https://img.shields.io/npm/v/fiorejs.svg?style=flat-square)](https://www.npmjs.com/package/fiorejs)
[![types](https://img.shields.io/npm/types/fiorejs.svg?style=flat-square)](https://github.com/vrtexe/fiore/blob/main/lib/html.d.ts)
[![license](https://img.shields.io/npm/l/fiorejs.svg?style=flat-square)](https://github.com/vrtexe/fiore/blob/main/LICENSE.md)
[![issues](https://img.shields.io/github/issues/vrtexe/fiore.svg?style=flat-square)](https://github.com/vrtexe/fiore/issues)

## Why this library

- **Native elements, not wrappers.** Every function calls `document.createElement` (or `createElementNS` for SVG and MathML) and returns that node, so there is nothing to unwrap before it goes into the DOM.
- **Four inputs in a fixed order.** `props`, `attributes`, `children` and `event` are applied in that order to every element; only `value`, `selectedIndex` and `checked` wait until after the children.
- **Nested props are merged in place.** A plain object such as `style` or `dataset` is merged into the element's existing object, so `style: { height: '100vh' }` sets one style property. Only the object's own keys are copied.
- **Children accept nodes, strings, numbers, arrays and promises.** `null`, `undefined`, `true` and `false` are skipped, so `user.isAdmin && badge()` works.
- **Listeners take options.** An event value can be a function, or an object with `handler` and `options` for `addEventListener`.
- **Typed per tag.** `element()` and every tag function return the exact element type, such as `HTMLInputElement`, and the same holds for SVG and MathML.
- **No dependencies, no build step needed.** The package is plain ES modules with TypeScript declarations.

## Install

```sh
npm install -D fiorejs
```

> Fiore was published as `html-dom-js` up to version 1.1.2. The API is unchanged: replace `html-dom-js` with `fiorejs` in your dependencies and imports.

## Usage

```js
import { button, div, input, label } from 'fiorejs';

document.body.append(
  div({
    props: { className: 'card', style: { padding: '16px' } },
    attributes: { 'aria-label': 'Sign up' },
    children: [
      label({ props: { htmlFor: 'email' }, children: 'Email' }),
      input({ props: { id: 'email', type: 'email', placeholder: 'you@example.com', required: true } }),
      button({
        props: { type: 'button' },
        event: { click: (event) => console.log('clicked', event.currentTarget) },
        children: 'Sign up',
      }),
    ],
  }),
);
```

Every tag has its own function, and `element(tag, data)` creates any element by name. Each function takes one optional object:

- `props`: JavaScript properties of the element, such as `className`, `value` or `style`. `undefined` leaves a property unchanged.
- `attributes`: attributes set with [`setAttribute`](https://developer.mozilla.org/en-US/docs/Web/API/Element/setAttribute). Names starting with `on` are ignored, so no inline handler is ever set.
- `children`: a node, a string, a number, a promise, or an array of these.
- `event`: listeners, attached last. Use this for handlers rather than `on*` props or attributes.

`value`, `selectedIndex` and `checked` are assigned after the attributes and children, so they can refer to them:

```js
select({ props: { value: 'M' }, children: [option({ children: 'S' }), option({ children: 'M' })] });
input({ props: { type: 'range', value: '150' }, attributes: { max: '200' } });
```

Import styles:

```js
// One function per tag:
import { element, div } from 'fiorejs';

// Or one object per namespace:
import html from 'fiorejs/html';
import svg from 'fiorejs/svg';
import math from 'fiorejs/math';
```

`fiorejs/global` exports the same three objects by name: `import { html, svg, math } from 'fiorejs/global'`.

The [MDN](https://developer.mozilla.org/en-US/docs/Web/API) documentation of each element applies to its props and attributes. TypeScript declarations are included.

### Events

Each element accepts the events of its own event map, so `body` takes window events such as `popstate`, and `video` takes media events such as `encrypted`. In a listener, `this` and `event.currentTarget` are typed as the element.

```js
import { input } from 'fiorejs';

input({
  event: {
    input: (event) => console.log(event.currentTarget.value),
    keydown: { handler: (event) => console.log(event.key), options: { once: true } },
  },
});
```

Custom event names that contain a hyphen are accepted on every element and typed as `CustomEvent`. Annotate the parameter to type its `detail`:

```ts
div({
  event: {
    'cart-add': (event: CustomEvent<{ sku: string }>) => console.log(event.detail.sku),
  },
});
```

For a custom event name without a hyphen, add it to the global event map:

```ts
declare global {
  interface HTMLElementEventMap {
    itemselected: CustomEvent<{ id: number }>;
  }
}
```

### Promise children

A child can be a promise, for example the result of an `async` component. Its place stays empty until the promise resolves, and is then filled with the result. If the promise rejects, the place stays empty and the error is logged with `console.error`.

```js
async function User(id) {
  const user = await fetch(`/users/${id}`).then((response) => response.json());
  return p({ children: user.name });
}

section({ children: [h2({ children: 'Profile' }), User(1)] });
```

### Attribute values

`null`, `undefined` and `false` leave an attribute out. Every other value, including `0` and `''`, is passed to `setAttribute`, which converts it to a string; Trusted Types objects are passed through unchanged. `aria-*` and `data-*` attributes, and the enumerated attributes `contenteditable`, `draggable` and `spellcheck`, keep `false` as the string `"false"`.

Versions before 1.2.0 skipped every falsy value, including `0` and `''`. Use `null` or `false` to leave an attribute out.

### Plugins (experimental)

A plugin can take over a property, attribute or child value before it is applied. `use()` registers it; `bind` returns `true` for the values it handles and calls `apply` with the current value now and whenever the value changes:

```js
import { use } from 'fiorejs';

use({
  name: 'my-observables',
  bind(value, apply, context) {
    if (!(value instanceof MyObservable)) return false;
    apply(value.current);
    value.subscribe(apply);
    return true;
  },
});
```

`context.kind` is `'property'`, `'attribute'` or `'child'`, and `context.element` is the element being built. Properties and attributes come with `context.name`; properties also carry `context.path`, the full key path such as `['style', 'color']`. A child comes with `context.nodes()`, the nodes it currently occupies, which can move to another parent, for example when it was built inside a fragment. Listeners in `event`, and props or attributes whose name starts with `on` in any case, are never offered to plugins. A child that a plugin binds without calling `apply` yet keeps an empty place until it does. Registering a plugin with a name that is already registered replaces the earlier plugin, so a plugin module that runs again, for example after a hot reload, does not register twice. The plugin API can still change in a minor version.

Plugins are asked in turn, and the first one that returns `true` handles the value. Set `order: 'pre'` to be asked before other plugins, or `order: 'post'` to be asked only after all others; plugins in the same group are asked in the order they were registered.

The `Plugin`, `BindContext` and `Live` types are exported from `fiorejs`. To tell TypeScript which live values a plugin accepts, extend `LiveValues`; props, attributes and children then accept those values:

```ts
declare module 'fiorejs/type/base.dom.d.ts' {
  interface LiveValues<T> {
    observable: MyObservable<T>;
  }
}
```

A plugin package usually calls `use()` in its own module. A module runs once per page however often it is imported, so the plugin is registered once.

#### One copy of fiorejs

Plugins are registered on the copy of fiorejs they import. If a page loads fiorejs from two different URLs, for example from two CDNs or two installed versions, a plugin can end up on one copy while elements are created by the other. fiorejs logs a warning in the console when a second copy loads.

Without a bundler, use an import map so every module resolves `fiorejs` to the same URL:

```html
<script type="importmap">
  {
    "imports": {
      "fiorejs": "https://cdn.jsdelivr.net/npm/fiorejs@1.2.0/lib/html.js",
      "fiorejs/svg": "https://cdn.jsdelivr.net/npm/fiorejs@1.2.0/lib/svg.js",
      "fiorejs/math": "https://cdn.jsdelivr.net/npm/fiorejs@1.2.0/lib/math.js"
    }
  }
</script>
<script type="module">
  import { div } from 'fiorejs';
</script>
```

Plugin packages should import fiorejs by its package name, never by a URL or relative path, so the import map applies to them too.

## Releases

Release notes are on the [GitHub releases page](https://github.com/vrtexe/fiore/releases).

## License

[MIT](https://github.com/vrtexe/fiore/blob/main/LICENSE.md)
