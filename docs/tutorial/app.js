// The tutorial app: picks a lesson from the URL hash, edits its code in CodeMirror and runs it in a sandboxed iframe
// that loads the released fiore from jsDelivr.
import { basicSetup, EditorView } from 'https://esm.sh/codemirror@6.0.2?deps=@codemirror/state@6.7.6,@codemirror/view@6.43.15';
import { javascript } from 'https://esm.sh/@codemirror/lang-javascript@6.2.5?deps=@codemirror/state@6.7.6,@codemirror/view@6.43.15';
import { oneDark } from 'https://esm.sh/@codemirror/theme-one-dark@6.1.3?deps=@codemirror/state@6.7.6,@codemirror/view@6.43.15';
import { highlight } from '../assets/highlight.js';
import { chapters } from './lessons.js';

const CDN = 'https://cdn.jsdelivr.net/npm';
const IMPORTS = {
  fiorejs: `${CDN}/fiorejs@2.1.0/lib/html.js`,
  'fiorejs/html': `${CDN}/fiorejs@2.1.0/lib/html.js`,
  'fiorejs/svg': `${CDN}/fiorejs@2.1.0/lib/svg.js`,
  'fiorejs/math': `${CDN}/fiorejs@2.1.0/lib/math.js`,
  '@fiorejs/signals': `${CDN}/@fiorejs/signals@2.1.0/src/signals.js`,
};

const lessons = chapters.flatMap((chapter) => chapter.lessons.map((lesson) => ({ ...lesson, chapter: chapter.title })));

const body = document.querySelector('[data-body]');
const select = document.querySelector('#tut-select');
const preview = document.querySelector('[data-preview]');
const output = document.querySelector('[data-console]');
const status = document.querySelector('[data-status]');
const prev = document.querySelector('[data-prev]');
const next = document.querySelector('[data-next]');
const solve = document.querySelector('[data-solve]');

for (const chapter of chapters) {
  const group = document.createElement('optgroup');
  group.label = chapter.title;
  for (const lesson of chapter.lessons) {
    group.append(new Option(lesson.title, lesson.slug));
  }
  select.append(group);
}

const storageKey = (slug) => `fiore-tutorial:${slug}`;
const load = (slug) => {
  try {
    return localStorage.getItem(storageKey(slug));
  } catch {
    return null;
  }
};
const save = (slug, code) => {
  try {
    localStorage.setItem(storageKey(slug), code);
  } catch {}
};
const forget = (slug) => {
  try {
    localStorage.removeItem(storageKey(slug));
  } catch {}
};

let lesson = lessons[0];
let timer = 0;

const editor = new EditorView({
  parent: document.querySelector('[data-editor]'),
  extensions: [
    basicSetup,
    javascript(),
    oneDark,
    EditorView.updateListener.of((update) => {
      if (!update.docChanged) return;
      save(lesson.slug, update.state.doc.toString());
      clearTimeout(timer);
      timer = setTimeout(run, 300);
    }),
  ],
});

const setCode = (code) => {
  editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: code } });
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

function run() {
  output.textContent = '';
  status.textContent = '';
  status.classList.remove('is-error');
  preview.srcdoc = page(editor.state.doc.toString());
}

addEventListener('message', (event) => {
  if (event.source !== preview.contentWindow || !event.data?.fiore) return;
  const line = document.createElement('div');
  line.textContent = event.data.text;
  if (event.data.kind === 'error') {
    line.className = 'is-error';
    status.textContent = 'Error';
    status.classList.add('is-error');
  }
  output.append(line);
});

function show(slug) {
  const index = Math.max(0, lessons.findIndex((item) => item.slug === slug));
  lesson = lessons[index];
  select.value = lesson.slug;
  body.innerHTML = `<p class="tut-chapter">${lesson.chapter}</p><h1>${lesson.title}</h1>${lesson.body}`;
  highlight(body);
  body.scrollTop = 0;
  prev.disabled = index === 0;
  next.disabled = index === lessons.length - 1;
  solve.disabled = !lesson.solution;
  solve.textContent = 'Solve';
  setCode(load(lesson.slug) ?? lesson.code);
  run();
  document.title = `${lesson.title}: fiore tutorial`;
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
  setCode(solved ? lesson.solution : lesson.code);
  solve.textContent = solved ? 'Undo' : 'Solve';
});
document.querySelector('[data-reset]').addEventListener('click', () => {
  forget(lesson.slug);
  setCode(lesson.code);
  solve.textContent = 'Solve';
});
addEventListener('hashchange', () => show(location.hash.slice(1)));

show(location.hash.slice(1));
