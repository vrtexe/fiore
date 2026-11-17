// The tutorial app: picks a lesson from the URL hash, edits its code in CodeMirror and runs it in a sandboxed iframe
// that loads the released fiore from jsDelivr. JSX lessons are compiled in the page with Sucrase first.
import { basicSetup, EditorView } from 'https://esm.sh/codemirror@6.0.2?deps=@codemirror/state@6.7.6,@codemirror/view@6.43.15';
import { javascript } from 'https://esm.sh/@codemirror/lang-javascript@6.2.5?deps=@codemirror/state@6.7.6,@codemirror/view@6.43.15';
import { oneDark } from 'https://esm.sh/@codemirror/theme-one-dark@6.1.3?deps=@codemirror/state@6.7.6,@codemirror/view@6.43.15';
import { highlight } from '../assets/highlight.js';
import { createSwitch, getSyntax, mountSyntax } from '../assets/syntax.js';
import { chapters } from './lessons.js';

const CDN = 'https://cdn.jsdelivr.net/npm';
const IMPORTS = {
  fiorejs: `${CDN}/fiorejs@2.1.0/lib/html.js`,
  'fiorejs/html': `${CDN}/fiorejs@2.1.0/lib/html.js`,
  'fiorejs/svg': `${CDN}/fiorejs@2.1.0/lib/svg.js`,
  'fiorejs/math': `${CDN}/fiorejs@2.1.0/lib/math.js`,
  '@fiorejs/signals': `${CDN}/@fiorejs/signals@2.1.0/src/signals.js`,
  '@fiorejs/jsx': `${CDN}/@fiorejs/jsx@2.1.0/src/index.js`,
  '@fiorejs/jsx/jsx-runtime': `${CDN}/@fiorejs/jsx@2.1.0/src/jsx-runtime.js`,
};
const SUCRASE = 'https://esm.sh/sucrase@3.35.1';

const lessons = chapters.flatMap((chapter) => chapter.lessons.map((lesson) => ({ ...lesson, chapter: chapter.title })));

const body = document.querySelector('[data-body]');
const select = document.querySelector('#tut-select');
const preview = document.querySelector('[data-preview]');
const output = document.querySelector('[data-console]');
const status = document.querySelector('[data-status]');
const file = document.querySelector('[data-file]');
const prev = document.querySelector('[data-prev]');
const next = document.querySelector('[data-next]');
const solve = document.querySelector('[data-solve]');

mountSyntax();
document.querySelector('[data-switch]').replaceWith(createSwitch());

for (const chapter of chapters) {
  const group = document.createElement('optgroup');
  group.label = chapter.title;
  for (const lesson of chapter.lessons) {
    group.append(new Option(lesson.title, lesson.slug));
  }
  select.append(group);
}

/** The lesson's starting code and solution in the current syntax; a lesson without JSX falls back to the builder. */
const source = (lesson, syntax = getSyntax()) =>
  syntax === 'jsx' && lesson.jsx ? { ...lesson.jsx, syntax: 'jsx' } : { code: lesson.code, solution: lesson.solution, syntax: 'builder' };

const storageKey = (slug, syntax) => `fiore-tutorial:${slug}:${syntax}`;
const store = (action, key, value) => {
  try {
    if (action === 'get') return localStorage.getItem(key);
    if (action === 'set') localStorage.setItem(key, value);
    if (action === 'remove') localStorage.removeItem(key);
  } catch {}
  return null;
};

let lesson = lessons[0];
let current = source(lesson);
let timer = 0;
let quiet = false;

const editor = new EditorView({
  parent: document.querySelector('[data-editor]'),
  extensions: [
    basicSetup,
    javascript({ jsx: true }),
    oneDark,
    EditorView.updateListener.of((update) => {
      if (!update.docChanged || quiet) return;
      store('set', storageKey(lesson.slug, current.syntax), update.state.doc.toString());
      clearTimeout(timer);
      timer = setTimeout(run, 300);
    }),
  ],
});

const setCode = (code) => {
  quiet = true;
  editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: code } });
  quiet = false;
};

/** The preview document: an import map for fiore, a console bridge and the lesson code as a module. */
const page = (code) => `<!doctype html>
<html><head><meta charset="utf-8">
<style>body{margin:0;padding:16px;font:15px/1.5 system-ui,sans-serif;color:#1d1f21}button{font:inherit}</style>
<script type="importmap">${JSON.stringify({ imports: IMPORTS })}</script>
<script>
  const send = (kind, args) => parent.postMessage({ fiore: true, kind, text: args.map((a) => typeof a === 'string' ? a : (() => { try { return JSON.stringify(a); } catch { return String(a); } })()).join(' ') }, '*');
  for (const kind of ['log', 'info', 'warn', 'error']) { const original = console[kind]; console[kind] = (...args) => { send(kind, args); original(...args); }; }
  addEventListener('error', (event) => send('error', [event.message]));
  addEventListener('unhandledrejection', (event) => send('error', [String(event.reason)]));
</script>
<script type="module">${code.replaceAll('</script', '<\\/script')}</script>
</head><body></body></html>`;

let compiler;
/** Compiles JSX with the automatic runtime from @fiorejs/jsx, the setting a fiore project uses. */
async function compile(code) {
  compiler ??= import(SUCRASE);
  const { transform } = await compiler;
  return transform(code, { transforms: ['jsx'], jsxRuntime: 'automatic', jsxImportSource: '@fiorejs/jsx', production: true }).code;
}

const say = (text, error) => {
  const line = document.createElement('div');
  line.textContent = text;
  if (error) {
    line.className = 'is-error';
    status.textContent = 'Error';
    status.classList.add('is-error');
  }
  output.append(line);
};

async function run() {
  output.textContent = '';
  status.textContent = '';
  status.classList.remove('is-error');
  let code = editor.state.doc.toString();
  if (current.syntax === 'jsx') {
    try {
      code = await compile(code);
    } catch (error) {
      say(String(error.message ?? error), true);
      return;
    }
  }
  preview.srcdoc = page(code);
}

addEventListener('message', (event) => {
  if (event.source !== preview.contentWindow || !event.data?.fiore) return;
  say(event.data.text, event.data.kind === 'error');
});

/** Loads the lesson's code in the current syntax: the reader's own edit, or the starting code. */
function load() {
  current = source(lesson);
  file.textContent = current.syntax === 'jsx' ? 'main.jsx' : 'main.js';
  solve.disabled = !current.solution;
  solve.textContent = 'Solve';
  setCode(store('get', storageKey(lesson.slug, current.syntax)) ?? current.code);
  run();
}

function show(slug) {
  const index = Math.max(0, lessons.findIndex((item) => item.slug === slug));
  lesson = lessons[index];
  select.value = lesson.slug;
  body.innerHTML = `<p class="tut-chapter">${lesson.chapter}</p><h1>${lesson.title}</h1>${lesson.body}`;
  highlight(body);
  body.scrollTop = 0;
  prev.disabled = index === 0;
  next.disabled = index === lessons.length - 1;
  document.title = `${lesson.title}: fiore tutorial`;
  load();
}

const go = (offset) => {
  const index = lessons.indexOf(lesson) + offset;
  if (lessons[index]) location.hash = lessons[index].slug;
};

select.addEventListener('change', () => (location.hash = select.value));
prev.addEventListener('click', () => go(-1));
next.addEventListener('click', () => go(1));
solve.addEventListener('click', () => {
  const solved = solve.textContent === 'Solve';
  setCode(solved ? current.solution : current.code);
  solve.textContent = solved ? 'Undo' : 'Solve';
  run();
});
document.querySelector('[data-reset]').addEventListener('click', () => {
  store('remove', storageKey(lesson.slug, current.syntax));
  setCode(current.code);
  solve.textContent = 'Solve';
  run();
});
addEventListener('hashchange', () => show(location.hash.slice(1)));
addEventListener('syntaxchange', load);

// Dividers: drag, or focus and use the arrow keys. Sizes are kept per browser.
const root = document.body;
for (const split of document.querySelectorAll('[data-split]')) {
  const vertical = split.dataset.split === 'x';
  const name = vertical ? '--lesson' : '--editor';
  const area = vertical ? document.querySelector('.tut') : document.querySelector('.tut-work');
  const apply = (percent) => {
    const value = Math.min(80, Math.max(15, percent));
    root.style.setProperty(name, `${value}%`);
    split.setAttribute('aria-valuenow', String(Math.round(value)));
    store('set', `fiore-tutorial-size${name}`, String(value));
  };
  const saved = Number(store('get', `fiore-tutorial-size${name}`));
  if (saved) apply(saved);
  split.setAttribute('aria-valuemin', '15');
  split.setAttribute('aria-valuemax', '80');

  split.addEventListener('pointerdown', (event) => {
    split.setPointerCapture(event.pointerId);
    split.classList.add('is-dragging');
    root.classList.add('tut-dragging');
  });
  split.addEventListener('pointermove', (event) => {
    if (!split.hasPointerCapture(event.pointerId)) return;
    const box = area.getBoundingClientRect();
    apply(vertical ? ((event.clientX - box.left) / box.width) * 100 : ((event.clientY - box.top - 40) / box.height) * 100);
  });
  const stop = (event) => {
    split.releasePointerCapture(event.pointerId);
    split.classList.remove('is-dragging');
    root.classList.remove('tut-dragging');
  };
  split.addEventListener('pointerup', stop);
  split.addEventListener('pointercancel', stop);
  split.addEventListener('keydown', (event) => {
    const step = { ArrowLeft: -2, ArrowUp: -2, ArrowRight: 2, ArrowDown: 2 }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const now = Number(split.getAttribute('aria-valuenow')) || (vertical ? 40 : 55);
    apply(now + step);
  });
}

show(location.hash.slice(1));
