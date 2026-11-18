#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const templates = fileURLToPath(new URL('./templates/', import.meta.url));

const versions = {
  '@eslint/js': '^10.0.0',
  '@fiorejs/jsx': '^2.2.0',
  '@fiorejs/signals': '^2.2.0',
  eslint: '^10.0.0',
  fiorejs: '^2.2.0',
  globals: '^17.0.0',
  oxfmt: '^0.75.0',
  oxlint: '^1.0.0',
  prettier: '^3.0.0',
  serve: '^14.0.0',
  typescript: '~5.9.0',
  'typescript-eslint': '^8.0.0',
  vite: '^8.0.0',
};

const choices = {
  build: [
    { value: 'vite', label: 'Vite' },
    { value: 'none', label: 'None (plain ES modules, no TypeScript or JSX)' },
  ],
  template: [
    { value: 'ts', label: 'TypeScript' },
    { value: 'js', label: 'JavaScript' },
  ],
  linter: [
    { value: 'eslint', label: 'ESLint' },
    { value: 'oxlint', label: 'Oxlint' },
    { value: 'none', label: 'None' },
  ],
  formatter: [
    { value: 'prettier', label: 'Prettier' },
    { value: 'oxfmt', label: 'oxfmt' },
    { value: 'none', label: 'None' },
  ],
};

const { values: flags, positionals } = parseArgs({
  allowPositionals: true,
  allowNegative: true,
  options: {
    build: { type: 'string' },
    template: { type: 'string' },
    jsx: { type: 'boolean' },
    signals: { type: 'boolean' },
    linter: { type: 'string' },
    formatter: { type: 'string' },
    yes: { type: 'boolean', short: 'y' },
  },
});

function fail(message) {
  console.error(message);
  process.exit(1);
}

for (const name of Object.keys(choices)) {
  const allowed = choices[name].map((choice) => choice.value);
  if (flags[name] !== undefined && !allowed.includes(flags[name])) {
    fail(`--${name} must be one of: ${allowed.join(', ')}`);
  }
}

const interactive = process.stdin.isTTY && !flags.yes;
const prompt = interactive ? createInterface({ input: process.stdin, output: process.stdout }) : undefined;

async function text(question, fallback) {
  return (prompt && (await prompt.question(`${question} (${fallback}): `)).trim()) || fallback;
}

async function choose(name, question, fallback) {
  if (flags[name] !== undefined) return flags[name];
  if (!prompt) return fallback;
  const options = choices[name];
  const list = options.map((option, index) => `  ${index + 1}) ${option.label}`).join('\n');
  const answer = await prompt.question(`${question}\n${list}\n(${options.findIndex((o) => o.value === fallback) + 1}): `);
  return options[Number(answer.trim()) - 1]?.value ?? fallback;
}

async function confirm(name, question, fallback) {
  if (flags[name] !== undefined) return flags[name];
  if (!prompt) return fallback;
  const answer = (await prompt.question(`${question} (${fallback ? 'Y/n' : 'y/N'}): `)).trim().toLowerCase();
  return answer ? answer.startsWith('y') : fallback;
}

const name = positionals[0] ?? (await text('Project name', 'fiore-app'));
const build = await choose('build', 'Build tool', 'vite');
if (build === 'none' && flags.template === 'ts') fail('TypeScript needs a build step; use --build vite.');
if (build === 'none' && flags.jsx) fail('JSX needs a build step; use --build vite.');
const language = build === 'none' ? 'js' : await choose('template', 'Language', 'ts');
const jsx = build === 'none' ? false : await confirm('jsx', 'Use JSX?', true);
const signals = await confirm('signals', 'Use signals?', true);
const linter = await choose('linter', 'Linter', 'oxlint');
const formatter = await choose('formatter', 'Formatter', 'prettier');
prompt?.close();

const target = resolve(name);
if (existsSync(target) && readdirSync(target).length > 0) {
  fail(`${target} already exists and is not empty.`);
}
mkdirSync(join(target, 'src'), { recursive: true });

const write = (file, content) => writeFileSync(join(target, file), content);
// Formats JSON like Prettier and oxfmt do: arrays of short values stay on one line.
const json = (value) =>
  `${JSON.stringify(value, null, 2).replace(/\[\n\s*([^[\]{}]*?)\n\s*\]/g, (_, items) => `[${items.split(/,\n\s*/).join(', ')}]`)}\n`;
const copy = (from, to) => copyFileSync(join(templates, from), join(target, to));
const sorted = (object) => Object.fromEntries(Object.entries(object).sort(([a], [b]) => a.localeCompare(b)));
const pick = (...names) => Object.fromEntries(names.map((dependency) => [dependency, versions[dependency]]));

const extension = language === 'ts' ? (jsx ? 'tsx' : 'ts') : jsx ? 'jsx' : 'js';
const root = build === 'vite' ? '/' : './';
copy(`app/${jsx ? 'jsx' : 'dom'}-${signals ? 'signals' : 'plain'}.${extension}`, `src/main.${extension}`);
copy('shared/style.css', 'src/style.css');
copy('shared/_gitignore', '.gitignore');

const importMap =
  build === 'none'
    ? `    <script type="importmap">
${JSON.stringify(
        {
          imports: {
            fiorejs: './node_modules/fiorejs/lib/html.js',
            ...(signals && { '@fiorejs/signals': './node_modules/@fiorejs/signals/src/signals.js' }),
          },
        },
        null,
        2,
      )
        .split('\n')
        .map((line) => `      ${line}`)
        .join('\n')}
    </script>
`
    : '';

write(
  'index.html',
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${basename(target)}</title>
    <link rel="icon" href="data:," />
    <link rel="stylesheet" href="${root}src/style.css" />
${importMap}  </head>
  <body>
    <script type="module" src="${root}src/main.${extension}"></script>
  </body>
</html>
`,
);

const scripts =
  build === 'vite'
    ? { dev: 'vite', build: language === 'ts' ? 'tsc && vite build' : 'vite build', preview: 'vite preview' }
    : { dev: 'serve .' };
if (linter === 'eslint') scripts.lint = 'eslint .';
if (linter === 'oxlint') scripts.lint = 'oxlint';
if (formatter === 'prettier') scripts.format = 'prettier --write .';
if (formatter === 'oxfmt') scripts.format = 'oxfmt';

const devDependencies = {
  ...(build === 'vite' ? pick('vite') : pick('serve')),
  ...(language === 'ts' && pick('typescript')),
  ...(linter === 'eslint' && pick('eslint', '@eslint/js', 'globals')),
  ...(linter === 'eslint' && language === 'ts' && pick('typescript-eslint')),
  ...(linter === 'oxlint' && pick('oxlint')),
  ...(formatter !== 'none' && pick(formatter)),
};

write(
  'package.json',
  json({
    name:
      basename(target)
        .toLowerCase()
        .replace(/[^a-z0-9._~-]+/g, '-')
        .replace(/^[._-]+|-+$/g, '') || 'fiore-app',
    version: '0.0.0',
    private: true,
    type: 'module',
    scripts,
    dependencies: sorted({
      ...pick('fiorejs'),
      ...(jsx && pick('@fiorejs/jsx')),
      ...(signals && pick('@fiorejs/signals')),
    }),
    devDependencies: sorted(devDependencies),
  }),
);

const jsxOptions = jsx ? { jsx: 'react-jsx', jsxImportSource: '@fiorejs/jsx' } : {};
if (language === 'ts') {
  write(
    'tsconfig.json',
    json({
      compilerOptions: {
        target: 'es2022',
        module: 'esnext',
        moduleResolution: 'bundler',
        ...jsxOptions,
        strict: true,
        lib: ['es2022', 'dom', 'dom.iterable'],
        types: ['vite/client'],
        noEmit: true,
      },
      include: ['src'],
    }),
  );
} else if (jsx) {
  write(
    'vite.config.js',
    `import { defineConfig } from 'vite';

export default defineConfig({
  oxc: { jsx: { importSource: '@fiorejs/jsx' } },
});
`,
  );
  write(
    'jsconfig.json',
    json({ compilerOptions: { target: 'es2022', module: 'esnext', moduleResolution: 'bundler', ...jsxOptions }, include: ['src'] }),
  );
}

if (linter === 'eslint') copy(`tools/eslint.${language}.config.js`, 'eslint.config.js');
if (linter === 'oxlint') copy('tools/.oxlintrc.json', '.oxlintrc.json');
if (formatter === 'prettier') copy('tools/.prettierrc.json', '.prettierrc.json');
if (formatter === 'oxfmt') copy('tools/.oxfmtrc.json', '.oxfmtrc.json');

const stack = [
  build === 'vite' ? 'Vite' : 'no build step',
  language === 'ts' ? 'TypeScript' : 'JavaScript',
  jsx && 'JSX',
  signals && 'signals',
  linter !== 'none' && choices.linter.find((choice) => choice.value === linter).label,
  formatter !== 'none' && choices.formatter.find((choice) => choice.value === formatter).label,
].filter(Boolean);

const rows = [
  ['Script', 'What it does'],
  ...Object.keys(scripts).map((script) => [
    `\`npm run ${script}\``,
    {
      dev: build === 'vite' ? 'Starts the dev server with hot reload.' : 'Serves the folder on a local port.',
      build: language === 'ts' ? 'Type-checks and writes the production build to `dist/`.' : 'Writes the production build to `dist/`.',
      preview: 'Serves the production build.',
      lint: 'Checks the code for problems.',
      format: 'Formats all files.',
    }[script],
  ]),
];
// Columns are padded to equal width, as Prettier and oxfmt format Markdown tables.
const widths = [0, 1].map((column) => Math.max(...rows.map((row) => row[column].length)));
const line = (cells) => `| ${cells.map((cell, column) => cell.padEnd(widths[column])).join(' | ')} |`;
const table = [line(rows[0]), line(widths.map((width) => '-'.repeat(width))), ...rows.slice(1).map(line)].join('\n');

write(
  'README.md',
  `# ${basename(target)}

Created with \`npm create @fiorejs\`: ${stack.join(', ')}.

\`\`\`sh
npm install
npm run dev
\`\`\`

${table}

\`src/main.${extension}\` is the entry point. [fiorejs](https://github.com/vrtexe/fiore) creates real DOM elements; there is no virtual DOM.
`,
);

const agent = process.env.npm_config_user_agent?.split('/')[0] ?? 'npm';
const folder = relative(process.cwd(), target) || '.';
console.log(`\nCreated ${folder} (${stack.join(', ')}). Next:\n`);
if (folder !== '.') console.log(`  cd ${folder}`);
console.log(`  ${agent} install`);
console.log(`  ${agent === 'npm' ? 'npm run' : agent} dev\n`);
