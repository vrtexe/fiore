import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../index.js', import.meta.url));

test('creates a project with a valid name and a .gitignore', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'fiore-create-'));

  const output = execFileSync('node', [cli, 'My App!'], { cwd, encoding: 'utf8' });
  const project = join(cwd, 'My App!');

  assert.equal(JSON.parse(readFileSync(join(project, 'package.json'), 'utf8')).name, 'my-app');
  assert.ok(existsSync(join(project, '.gitignore')));
  assert.ok(!existsSync(join(project, '_gitignore')));
  assert.ok(existsSync(join(project, 'src/main.tsx')));
  assert.match(output, /cd My App!\n {2}npm install\n {2}npm run dev/);
});

test('refuses a folder that is not empty', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'fiore-create-'));
  mkdirSync(join(cwd, 'taken'));
  writeFileSync(join(cwd, 'taken/file.txt'), '');

  const result = spawnSync('node', [cli, 'taken'], { cwd, encoding: 'utf8' });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /already exists and is not empty/);
});
