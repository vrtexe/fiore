#!/usr/bin/env node
import { cpSync, existsSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const template = fileURLToPath(new URL('./template', import.meta.url));

async function askName() {
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await prompt.question('Project name (fiore-app): ');
  prompt.close();
  return answer.trim() || 'fiore-app';
}

/** Turns a folder name into a valid npm package name. */
function packageName(folder) {
  return (
    basename(folder)
      .toLowerCase()
      .replace(/[^a-z0-9._~-]+/g, '-')
      .replace(/^[._-]+|-+$/g, '') || 'fiore-app'
  );
}

const name = process.argv[2] ?? (await askName());
const target = resolve(name);

if (existsSync(target) && readdirSync(target).length > 0) {
  console.error(`${target} already exists and is not empty.`);
  process.exit(1);
}

cpSync(template, target, { recursive: true });
renameSync(join(target, '_gitignore'), join(target, '.gitignore'));

const manifestPath = join(target, 'package.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
manifest.name = packageName(target);
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

const agent = process.env.npm_config_user_agent?.split('/')[0] ?? 'npm';
const run = agent === 'npm' ? 'npm run' : agent;
const folder = relative(process.cwd(), target) || '.';

console.log(`\nCreated ${folder}. Next:\n`);
if (folder !== '.') {
  console.log(`  cd ${folder}`);
}
console.log(`  ${agent} install`);
console.log(`  ${run} dev\n`);
