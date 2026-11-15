// Formats the TypeScript app variants and the shared styles, and generates the JavaScript variants from them.
// Run after editing templates/app/*.ts(x) or templates/shared/style.css.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import * as prettier from 'prettier';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';

const dir = new URL('../templates/app/', import.meta.url);
const check = process.argv.includes('--check');
const options = { singleQuote: true, printWidth: 120 };
let stale = 0;

function update(url, content) {
  let current = '';
  try {
    current = readFileSync(url, 'utf8');
  } catch {}
  if (current === content) return;
  if (check) {
    console.error(`${fileURLToPath(url)} is out of date; run npm run generate`);
    stale++;
  } else {
    writeFileSync(url, content);
  }
}

const styles = new URL('../templates/shared/style.css', import.meta.url);
update(styles, await prettier.format(readFileSync(styles, 'utf8'), { ...options, parser: 'css' }));

for (const file of readdirSync(dir).filter((name) => /\.tsx?$/.test(name))) {
  const formatted = await prettier.format(readFileSync(new URL(file, dir), 'utf8'), { ...options, parser: 'typescript' });
  update(new URL(file, dir), formatted);
  // Blank lines are dropped by the TypeScript emitter, so they travel through it as comments.
  const source = formatted.replaceAll('\n\n', '\n//__BLANK__\n');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.Preserve },
  });
  const target = file.replace(/\.ts$/, '.js').replace(/\.tsx$/, '.jsx');
  const stripped = outputText.replace(/^\s*\/\/__BLANK__$/gm, '').replaceAll(`src/${file.replace(/^[a-z]+-[a-z]+/, 'main')}`, `src/main.${target.split('.').pop()}`);
  const output = await prettier.format(stripped, { ...options, parser: 'babel' });
  update(new URL(target, dir), output);

}

process.exit(stale ? 1 : 0);
