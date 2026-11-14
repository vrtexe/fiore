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

Vite, esbuild and Babel read the same setting, or take it as `jsxImportSource: '@fiorejs/jsx'` in their own JSX options.

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
| `on` + event name | event listener | `onclick`, `onkeydown`, `oncart-add` |
| `style` with an object | style properties | `style={{ height: '10px' }}` |
| a writable property of the element | property | `value`, `checked`, `className`, `type` |
| anything else | attribute | `class`, `for`, `aria-label`, `data-id`, `list` |

Everything after `on` is used as the event name, exactly as written, so custom events work the same way as built-in ones: `oncart-add` listens to `cart-add`. A listener can also be an object with `handler` and `options`, which go to `addEventListener`:

```tsx
<input onkeydown={{ handler: (event) => console.log(event.key), options: { once: true } }} />
```

On SVG elements every prop except listeners and a `style` object is set as an attribute.

## Components and fragments

A component is a function that takes props and returns a node:

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

A component can be `async`. Its place stays empty until it resolves, and then it is filled with the result:

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

An async component has to be the child of an element or a fragment; on its own it is a promise, not a node.

`<>...</>` returns a `DocumentFragment`. Children can be nodes, strings, numbers or nested arrays; `null`, `undefined`, `true` and `false` are skipped.

## Types

Tags, attributes, properties and listeners are typed per element. In a listener, `event.currentTarget` is the element. Listeners for custom event names with a hyphen receive a `CustomEvent`; annotate the parameter to type its `detail`. Custom elements (tags with a hyphen) accept any prop.

A JSX expression is typed as `Node`, not as the specific element. Cast it when you need the element type:

```tsx
const input = (<input value="Ada" />) as HTMLInputElement;
```

## Limits

- `a`, `script`, `style` and `title` always create HTML elements, also inside `<svg>`.
- `key` is ignored, because nothing is diffed.
- Every prop that starts with `on` is treated as a listener, so a custom element property such as `online` has to be set in code.

## License

[MIT](LICENSE.md)
