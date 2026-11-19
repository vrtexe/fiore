# @fiorejs/jsx

JSX runtime for [fiorejs](https://github.com/vrtexe/fiore). Write HTML and SVG as JSX and get real DOM nodes back.

There is no virtual DOM and no re-rendering: each JSX expression creates its elements once, the same way the fiorejs element functions do.

## Install

```sh
npm install fiorejs @fiorejs/jsx
```

Point the JSX compiler at the runtime. In `tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@fiorejs/jsx"
  }
}
```

Vite reads this setting from `tsconfig.json` for TypeScript files, so no plugin is needed. Other tools take the import source in their own options:

| Tool | Setting |
| --- | --- |
| Vite, JavaScript files | `oxc: { jsx: { importSource: '@fiorejs/jsx' } }` in `vite.config.js` |
| esbuild | `--jsx=automatic --jsx-import-source=@fiorejs/jsx` |
| Babel | `@babel/plugin-transform-react-jsx` with `{ runtime: 'automatic', importSource: '@fiorejs/jsx' }` (Babel does not read `tsconfig.json`) |
| any file | a `/** @jsxImportSource @fiorejs/jsx */` comment at the top |

## Usage

```tsx
const save = () => console.log('saved');

document.body.append(
  <form class="card" onsubmit={(event) => event.preventDefault()}>
    <label for="name">Name</label>
    <input id="name" value="Ada" required />
    <button type="submit" aria-label="Save" onclick={save}>
      Save
    </button>
  </form>,
);
```

## How props are applied

Each JSX prop goes to one of the fiorejs inputs:

| Prop | Applied as | Example |
| --- | --- | --- |
| `on` + event name; the first letter of the event name is lowercased, the rest is kept | event listener | `onclick` and `onClick` listen to `click`, `onvalueChanged` and `onValueChanged` to `valueChanged`, `oncart-add` to `cart-add` |
| `null` | removes the attribute | `title={null}` |
| `style` or `dataset` with an object | style properties, data attributes | `style={{ height: '10px' }}`, `dataset={{ id: '42' }}` |
| a camel-case name the element has a writable property for | property | `className`, `textContent`, `htmlFor`, `selectedIndex` |
| `value`, `checked`, `selected`, `muted`, `indeterminate`, `volume`, `text` or `files`, where the element has it | property | `<input value="Ada" />` |
| an object or function on a custom element, or a prop its class defines a setter for | property | `<x-chart data={points} />` |
| any other name | attribute | `class`, `for`, `id`, `title`, `type`, `disabled`, `aria-label`, `width="50%"` |

The name alone decides, never the value, so `width="50%"` stays an attribute and `disabled={false}` removes it. Custom elements are looked up each time they are used, so once a class is defined, the next elements get the props its setters take. An element created before its class is defined gets object and function props as properties, but string props as attributes, and its upgrade does not call the setters for them: define the class first, or read those values with `observedAttributes`. A string for a custom element prop that is only a plain class field, with no setter, is set as an attribute. `value`, `selectedIndex` and `checked` are applied after the attributes and children, so `<select value="b">` selects its option `b`.

### Live values

A prop or child can be a live value, such as a signal from [@fiorejs/signals](https://github.com/vrtexe/fiore/tree/main/packages/signals). On built-in elements a live value goes where a plain value with the same name goes, so a signal holding `null` removes the `title` attribute just like `title={null}`. On a custom element an object value, which includes every live value, goes to the property of that name, so bind an attribute such as `class` or `aria-label` with a plain value or set it in code. A function is never live: `class={() => ...}` passes the function itself, so write a derived value as `class={computed(() => ...)}`. On a custom element a function prop is therefore always a callback.

Everything after `on` is used as the event name as written, except that its first letter is lowercased, so custom events work the same way as built-in ones: `oncart-add` listens to `cart-add` and `onvalueChanged` or `onValueChanged` to `valueChanged`. Built-in events are lowercase, so `onKeydown` listens to `keydown`, but `onKeyDown` listens to `keyDown`, which no element fires; the types only offer `onkeydown` and `onKeydown`. An event whose name starts with a capital letter, such as `DOMContentLoaded`, has no JSX form; listen to it with the builder's `on({ DOMContentLoaded })` or in code. A listener can also be an object with `handler` and `options`, which go to `addEventListener`:

```tsx
<input onkeydown={{ handler: (event) => console.log(event.key), options: { once: true } }} />
```

On SVG elements every prop except listeners and a `style` or `dataset` object is set as an attribute.

## Components and fragments

A component is a function that takes props and returns a node, or anything else a child can be:

```tsx
import type { Child } from '@fiorejs/jsx/jsx-runtime';

function Card(props: { title: string; children?: Child }) {
  return (
    <section>
      <h2>{props.title}</h2>
      {props.children}
    </section>
  );
}
```

A component may also return anything a child can be: a live value such as `open.if(...)`, text, `null` or a list. Such a result comes back in a fragment, so it renders as that child would, also when `<Panel />` is appended at the top level rather than placed in an element:

```tsx
const Panel = () => open.if(() => <p>Open</p>);
const Nothing = () => null;

document.body.append(<Panel />, <Nothing />);
```

A component can be `async`. It returns a fragment with two empty comments that hold its place, and the result is put between them when it resolves, like a live child; a rejection goes to `reportError`. The comments stay, so a list row or a branch made of an async component keeps its place when the list changes later. This works anywhere, also outside an element:

```tsx
async function User(props: { id: number }) {
  const user = await fetch(`/users/${props.id}`).then((response) => response.json());
  return <p>{user.name}</p>;
}

<section>
  <h2>Profile</h2>
  <User id={1} />
</section>;
```

`<>...</>` returns a `DocumentFragment`. Children can be nodes, strings, numbers or nested arrays; `null`, `undefined`, `true` and `false` are skipped.

## Types

Tags, attributes, properties and listeners are typed per element. In a listener, `event.currentTarget` is the element. Listeners for custom event names with a hyphen receive a `CustomEvent`; annotate the parameter to type its `detail`. Custom elements (tags with a hyphen) accept any prop.

A JSX expression is typed as `Node`, not as the specific element. To get the element with its type, pass `ref`, a function that is called with the finished element, like the builder's `also`:

```tsx
let input!: HTMLInputElement;
const form = <form><input value="Ada" ref={(element) => (input = element)} /></form>;
document.body.append(form);
input.focus();
```

`ref` runs when the element is created, before a parent inserts it, so the element is not in the document yet and focusing or measuring it inside `ref` does nothing. Use the element after inserting the tree, as above, or, with `@fiorejs/signals`, in `effect.post`, whose first run waits for the next flush: `<input ref={(element) => effect.post(() => element.focus())} />`.

Or cast the expression when it is the element itself: `(<input value="Ada" />) as HTMLInputElement`.

## Limits

- Attribute values are passed to `setAttribute` unchecked, so a `javascript:` URL in `href` or `src` runs when it is followed. Check the scheme of a URL that comes from untrusted data.
- `a`, `script`, `style` and `title` always create HTML elements, also inside `<svg>`.
- `key` is accepted and ignored, because nothing is diffed; to reuse rows in a list, key it with `@fiorejs/signals`: `todos.for((todo) => todo.id).map(render)`. A `key` after a spread (`<li {...props} key="a" />`) compiles to `createElement` from `@fiorejs/jsx`, which the package exports.
- Do not spread objects whose keys come from users: a key such as `innerHTML` or `srcdoc` sets that property or attribute.
- Every prop that starts with `on` is treated as a listener, so a custom element property such as `online` has to be set in code.

## License

[MIT](LICENSE.md)
