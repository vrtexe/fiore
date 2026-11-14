// Generates a set of projects covering every app variant and tool, then installs, builds, lints and checks formatting.
// Usage: node scripts/e2e.js [core jsx signals]  (local package folders, for packages that are not published yet)
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../index.js', import.meta.url));
const [core, jsx, signals] = process.argv.slice(2).map((folder) => resolve(folder));
const local = { fiorejs: core, '@fiorejs/jsx': jsx, '@fiorejs/signals': signals };

const combinations = [
  ['--template', 'ts', '--jsx', '--signals', '--linter', 'eslint', '--formatter', 'prettier'],
  ['--template', 'ts', '--jsx', '--no-signals', '--linter', 'oxlint', '--formatter', 'oxfmt'],
  ['--template', 'ts', '--no-jsx', '--signals', '--linter', 'oxlint', '--formatter', 'prettier'],
  ['--template', 'ts', '--no-jsx', '--no-signals', '--linter', 'eslint', '--formatter', 'oxfmt'],
  ['--template', 'js', '--jsx', '--signals', '--linter', 'oxlint', '--formatter', 'oxfmt'],
  ['--template', 'js', '--jsx', '--no-signals', '--linter', 'eslint', '--formatter', 'prettier'],
  ['--template', 'js', '--no-jsx', '--signals', '--linter', 'eslint', '--formatter', 'oxfmt'],
  ['--template', 'js', '--no-jsx', '--no-signals', '--linter', 'none', '--formatter', 'none'],
  ['--build', 'none', '--signals', '--linter', 'oxlint', '--formatter', 'prettier'],
  ['--build', 'none', '--no-signals', '--linter', 'eslint', '--formatter', 'oxfmt'],
];

const root = mkdtempSync(join(tmpdir(), 'fiore-e2e-'));
const run = (cwd, command, ...args) => execFileSync(command, args, { cwd, encoding: 'utf8', stdio: 'pipe' });
let failures = 0;

for (const [index, flags] of combinations.entries()) {
  const name = `app-${index + 1}`;
  const cwd = join(root, name);
  const label = `${name} ${flags.join(' ')}`;
  try {
    run(root, 'node', cli, name, ...flags);
    const manifest = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8'));
    for (const [dependency, folder] of Object.entries(local)) {
      if (folder && manifest.dependencies[dependency]) manifest.dependencies[dependency] = `file:${folder}`;
    }
    writeFileSync(join(cwd, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');

    run(cwd, 'npm', 'install', '--install-links', '--legacy-peer-deps', '--no-audit', '--no-fund');
    if (manifest.scripts.build) run(cwd, 'npm', 'run', 'build');
    if (manifest.scripts.lint) run(cwd, 'npm', 'run', 'lint');
    if (manifest.devDependencies.prettier) run(cwd, 'npx', 'prettier', '--check', '.');
    if (manifest.devDependencies.oxfmt) run(cwd, 'npx', 'oxfmt', '--check');
    console.log(`ok   ${label}`);
  } catch (error) {
    failures++;
    console.log(`FAIL ${label}\n${error.stdout ?? ''}${error.stderr ?? error.message}`);
  }
}

console.log(`\n${combinations.length - failures}/${combinations.length} passed in ${root}`);
process.exit(failures ? 1 : 0);
