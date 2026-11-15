# @fiorejs/create

Creates a new [fiorejs](https://github.com/vrtexe/fiore) app. It asks for the build tool, the language, JSX, signals, a linter and a formatter, then writes a ready project with its own README.

```sh
npm create @fiorejs
```

Pass a folder name to skip the first question: `npm create @fiorejs my-app`. Node.js 20.16 or later is required.

## Options

Every question can also be answered with a flag. `--yes` (`-y`) takes the default for every question that has no flag, which is also what happens when the input is not a terminal.

| Flag | Values | Default |
| --- | --- | --- |
| `--build` | `vite`, `none` | `vite` |
| `--template` | `ts`, `js` | `ts` |
| `--jsx`, `--no-jsx` | | JSX on |
| `--signals`, `--no-signals` | | signals on |
| `--linter` | `eslint`, `oxlint`, `none` | `oxlint` |
| `--formatter` | `prettier`, `oxfmt`, `none` | `prettier` |

```sh
npm create @fiorejs my-app -- --template js --no-jsx --linter eslint
```

With npm, flags after the folder name need the `--` separator, as above.

## What you get

- `--build vite`: a Vite project with `dev`, `build` and `preview` scripts. TypeScript and JSX need it; JSX uses [`@fiorejs/jsx`](https://github.com/vrtexe/fiore/tree/main/packages/jsx).
- `--build none`: plain ES modules with an import map and no build step, served with `npm run dev`. It is always JavaScript without JSX.
- `--signals`: the example app keeps its state in [`@fiorejs/signals`](https://github.com/vrtexe/fiore/tree/main/packages/signals); without it, the app updates the DOM directly.
- The chosen linter and formatter come with their configuration and `lint` and `format` scripts.

The target folder must be empty or not exist yet.

## License

[MIT](LICENSE.md)
