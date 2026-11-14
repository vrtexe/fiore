# Fiore app

Created with `npm create @fiorejs`.

```sh
npm install
npm run dev
```

- `src/main.tsx` is the entry point. JSX creates real DOM elements through [fiorejs](https://github.com/vrtexe/fiore); there is no virtual DOM.
- `tsconfig.json` points JSX at the runtime with `"jsx": "react-jsx"` and `"jsxImportSource": "@fiorejs/jsx"`. Vite reads the same setting, so no plugin is needed.
- `npm run build` type-checks and writes the production build to `dist/`.
