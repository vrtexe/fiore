import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../index.js', import.meta.url));

function create(...args) {
  const cwd = mkdtempSync(join(tmpdir(), 'fiore-create-'));
  const result = spawnSync('node', [cli, ...args], { cwd, encoding: 'utf8' });
  const read = (file) => readFileSync(join(cwd, args[0], file), 'utf8');
  return { ...result, cwd, read, has: (file) => existsSync(join(cwd, args[0], file)) };
}

test('without a terminal it uses the defaults: Vite, TypeScript, JSX, signals, Oxlint, Prettier', () => {
  const app = create('My App!');
  const manifest = JSON.parse(app.read('package.json'));

  assert.equal(app.status, 0);
  assert.equal(manifest.name, 'my-app');
  assert.deepEqual(Object.keys(manifest.dependencies), ['@fiorejs/jsx', '@fiorejs/signals', 'fiorejs']);
  assert.deepEqual(Object.keys(manifest.devDependencies), ['oxlint', 'prettier', 'typescript', 'vite']);
  assert.equal(manifest.scripts.build, 'tsc && vite build');
  assert.match(app.read('src/main.tsx'), /@fiorejs\/signals/);
  assert.equal(JSON.parse(app.read('tsconfig.json')).compilerOptions.jsxImportSource, '@fiorejs/jsx');
  assert.ok(app.has('.gitignore') && app.has('.oxlintrc.json') && app.has('.prettierrc.json'));
  assert.match(app.stdout, /cd My App!\n {2}npm install\n {2}npm run dev/);
});

test('JavaScript with JSX configures Vite and the editor', () => {
  const app = create('app', '--template', 'js', '--no-signals', '--linter', 'eslint', '--formatter', 'oxfmt');

  assert.equal(app.status, 0);
  assert.match(app.read('vite.config.js'), /importSource: '@fiorejs\/jsx'/);
  assert.ok(app.has('jsconfig.json') && app.has('src/main.jsx') && !app.has('tsconfig.json'));
  assert.match(app.read('eslint.config.js'), /ecmaFeatures: \{ jsx: true \}/);
  assert.ok(app.has('.oxfmtrc.json'));
});

test('without a build step it uses plain JavaScript and an import map', () => {
  const app = create('app', '--build', 'none', '--linter', 'none', '--formatter', 'none');
  const manifest = JSON.parse(app.read('package.json'));

  assert.equal(app.status, 0);
  assert.match(app.read('index.html'), /"@fiorejs\/signals": "\.\/node_modules\/@fiorejs\/signals\/src\/signals\.js"/);
  assert.ok(app.has('src/main.js') && !app.has('tsconfig.json') && !app.has('vite.config.js'));
  assert.deepEqual(manifest.devDependencies, { serve: '^14.0.0' });
  assert.equal(manifest.scripts.dev, 'serve .');
});

test('rejects combinations that need a build step and unknown values', () => {
  assert.match(create('app', '--build', 'none', '--template', 'ts').stderr, /TypeScript needs a build step/);
  assert.match(create('app', '--build', 'none', '--jsx').stderr, /JSX needs a build step/);
  assert.match(create('app', '--linter', 'biome').stderr, /--linter must be one of: eslint, oxlint, none/);
});

test('refuses a folder that is not empty', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'fiore-create-'));
  mkdirSync(join(cwd, 'taken'));
  writeFileSync(join(cwd, 'taken/file.txt'), '');

  const result = spawnSync('node', [cli, 'taken'], { cwd, encoding: 'utf8' });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /already exists and is not empty/);
});
