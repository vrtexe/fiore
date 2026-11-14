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
  <form class="card" onSubmit={(event) => event.preventDefault()}>
    <label for="name">Name</label>
    <input id="name" value="Ada" required />
    <button type="submit" aria-label="Save" onClick={save}>
      Save
    </button>
  </form>,
);
```

## How props are applied

Each JSX prop goes to one of the fiorejs inputs:

| Prop | Applied as | Example |
| --- | --- | --- |
| `on` + capitalised event name | event listener | `onClick`, `onKeydown`, `onPointerdown` |
| `on:` + any event name | event listener | `on:cart-add`, `on:my-event` |
| `style` with an object | style properties | `style={{ height: '10px' }}` |
| a writable property of the element | property | `value`, `checked`, `className`, `type` |
| anything else | attribute | `class`, `for`, `aria-label`, `data-id`, `list` |

The event name after `on` is the DOM event name with its first letter capitalised, so `keydown` becomes `onKeydown`, not `onKeyDown`. A listener can also be an object with `handler` and `options`, which go to `addEventListener`:

```tsx
<input onKeydown={{ handler: (event) => console.log(event.key), options: { once: true } }} />
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

`<>...</>` returns a `DocumentFragment`. Children can be nodes, strings, numbers or nested arrays; `null`, `undefined`, `true` and `false` are skipped.

## Types

Tags, attributes, properties and listeners are typed per element. In a listener, `event.currentTarget` is the element. Listeners added with `on:` receive a `CustomEvent`; annotate the parameter to type its `detail`. Custom elements (tags with a hyphen) accept any prop.

A JSX expression is typed as `Node`, not as the specific element. Cast it when you need the element type:

```tsx
const input = (<input value="Ada" />) as HTMLInputElement;
```

## Limits

- `a`, `script`, `style` and `title` always create HTML elements, also inside `<svg>`.
- `key` is ignored, because nothing is diffed.

## License

[MIT](LICENSE.md)
