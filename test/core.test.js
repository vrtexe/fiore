import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';

const { window } = new JSDOM();
Object.assign(globalThis, { document: window.document, Node: window.Node });

const { div, input, element, use } = await import('../lib/html.js');
const { default: math } = await import('../lib/math.js');
const { default: svg } = await import('../lib/svg.js');

/** Minimal signal used to exercise the plugin hook. */
function signal(value) {
  const subscribers = new Set();
  return {
    isSignal: true,
    get: () => value,
    set(next) {
      value = next;
      subscribers.forEach((apply) => apply(next));
    },
    subscribe: (apply) => subscribers.add(apply),
  };
}

const contexts = [];
use({
  name: 'test-signals',
  bind(value, apply, context) {
    if (!value?.isSignal) {
      return false;
    }
    contexts.push(context);
    apply(value.get());
    value.subscribe(apply);
    return true;
  },
});

test('nested props merge into existing objects and other objects are assigned whole', () => {
  const stream = new (class MediaStreamLike {})();
  const el = element('video', { props: { srcObject: stream, style: { height: '10px' } } });

  assert.equal(el.srcObject, stream);
  assert.equal(el.style.height, '10px');
});

test('attributes keep 0 and empty strings, drop false and null, and keep "false" for aria-*', () => {
  const el = div({
    attributes: { tabindex: 0, title: '', hidden: false, lang: null, 'aria-expanded': false },
  });

  assert.equal(el.getAttribute('tabindex'), '0');
  assert.equal(el.getAttribute('title'), '');
  assert.equal(el.hasAttribute('hidden'), false);
  assert.equal(el.hasAttribute('lang'), false);
  assert.equal(el.getAttribute('aria-expanded'), 'false');
});

test('children accept strings, numbers, nodes and arrays', () => {
  const el = div({ children: ['a', document.createElement('b'), 'c'] });

  assert.equal(el.innerHTML, 'a<b></b>c');
  assert.equal(div({ children: 'only' }).textContent, 'only');
});

test('a plugin can bind properties and attributes', () => {
  const value = signal('first');
  const label = signal('Open');
  const el = input({ props: { value }, attributes: { 'aria-label': label } });

  value.set('second');
  label.set(null);

  assert.equal(el.value, 'second');
  assert.equal(el.hasAttribute('aria-label'), false);
  assert.deepEqual(
    contexts.slice(-2).map(({ kind, name }) => [kind, name]),
    [['property', 'value'], ['attribute', 'aria-label']],
  );
});

test('a bound text child updates its text node in place', () => {
  const count = signal(1);
  const el = div({ children: ['Count: ', count] });
  const text = el.lastChild;

  count.set(2);

  assert.equal(el.textContent, 'Count: 2');
  assert.equal(el.lastChild, text);
});

test('a bound child can switch between nodes, lists and nothing', () => {
  const content = signal('text');
  const el = div({ children: ['[', content, ']'] });

  content.set([document.createElement('i'), 'x']);
  assert.equal(el.innerHTML, '[<i></i>x]');

  content.set(null);
  assert.equal(el.innerHTML, '[]');

  content.set(document.createElement('b'));
  assert.equal(el.innerHTML, '[<b></b>]');
});

test('a bound child keeps and reorders nodes it returns again', () => {
  const [a, b, c] = ['a', 'b', 'c'].map((tag) => document.createElement(tag));
  const rows = signal([a, b, c]);
  const el = div({ children: ['<', rows, '>'] });
  const focusLike = b;

  rows.set([c, a, b]);
  assert.equal(el.innerHTML, '&lt;<c></c><a></a><b></b>&gt;');
  assert.equal(el.querySelector('b'), focusLike);

  rows.set([a]);
  assert.equal(el.innerHTML, '&lt;<a></a>&gt;');
});

test('a promise child is inserted where it was once it resolves', async () => {
  const el = div({ children: ['a', Promise.resolve(document.createElement('b')), 'c'] });
  assert.equal(el.innerHTML, 'ac');

  await Promise.resolve();
  await Promise.resolve();
  assert.equal(el.innerHTML, 'a<b></b>c');
});

test('a rejected promise child leaves its place empty and logs the error', async (t) => {
  const error = t.mock.method(console, 'error', () => {});

  const el = div({ children: ['a', Promise.reject(new Error('failed')), 'c'] });
  await new Promise((resolve) => setTimeout(resolve));

  assert.equal(el.innerHTML, 'ac');
  assert.equal(error.mock.calls[0].arguments[0].message, 'failed');
});

test('registering a plugin name again replaces the earlier plugin', () => {
  const marker = { isMarker: true };
  use({ name: 'marker', bind: (value, apply) => value === marker && (apply('first'), true) });
  use({ name: 'marker', bind: (value, apply) => value === marker && (apply('second'), true) });

  assert.equal(div({ children: marker }).textContent, 'second');
});

test('pre plugins are asked first and post plugins last', () => {
  const shared = { isShared: true };
  const claim = (text) => (value, apply) => value === shared && (apply(text), true);
  use({ name: 'late', order: 'post', bind: claim('post') });
  use({ name: 'plain', bind: claim('plain') });
  assert.equal(div({ children: shared }).textContent, 'plain');

  use({ name: 'early', order: 'pre', bind: claim('pre') });
  assert.equal(div({ children: shared }).textContent, 'pre');
});

test('loading a second copy of fiorejs logs a warning', async (t) => {
  const warn = t.mock.method(console, 'warn', () => {});

  await import('../lib/core/plugins.js?second-copy');

  assert.equal(warn.mock.callCount(), 1);
  assert.match(warn.mock.calls[0].arguments[0], /fiorejs is loaded twice/);
});

test('JSON __proto__ keys and inherited keys never reach Object.prototype or the element', () => {
  div({ props: { dataset: JSON.parse('{"__proto__":{"__proto__":{"polluted":"yes"}}}') } });
  div({ props: { style: JSON.parse('{"__proto__":{"polluted":"yes"}}') } });
  assert.equal({}.polluted, undefined);

  Object.prototype.id = 'inherited';
  try {
    assert.equal(div({ props: { className: 'card' }, attributes: { role: 'note' } }).id, '');
  } finally {
    delete Object.prototype.id;
  }
});

test('props are not merged into the document or the window', () => {
  const title = document.title;
  try {
    div({ props: JSON.parse('{"ownerDocument":{"title":"pwned"}}') });
  } catch {
    // assigning a read-only property throws, which is fine
  }
  assert.equal(document.title, title);
});

test('MathML elements are created in the MathML namespace', () => {
  assert.equal(math.mi({ children: 'x' }).namespaceURI, 'http://www.w3.org/1998/Math/MathML');
});

test('reordering a bound list moves only the nodes that changed place', () => {
  const nodes = Array.from({ length: 100 }, (_, i) => {
    const item = document.createElement('i');
    item.textContent = String(i);
    return item;
  });
  const rows = signal(nodes);
  const el = div({ children: rows });
  let moves = 0;
  const insertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (...args) {
    moves++;
    return insertBefore.apply(this, args);
  };
  try {
    const swapped = [...nodes];
    [swapped[1], swapped[98]] = [swapped[98], swapped[1]];
    rows.set(swapped);
    assert.ok(moves <= 2, `swap made ${moves} moves`);
    assert.deepEqual([...el.children], swapped);

    moves = 0;
    const rotated = [swapped[99], ...swapped.slice(0, 99)];
    rows.set(rotated);
    assert.equal(moves, 1);
    assert.deepEqual([...el.children], rotated);
  } finally {
    Node.prototype.insertBefore = insertBefore;
  }
});

test('children skip false, true and null, and keep 0', () => {
  assert.equal(div({ children: [false, 'a', true, null, 0] }).innerHTML, 'a0');
  assert.equal(div({ children: false }).innerHTML, '');
});

test('textContent and innerHTML props are kept when there are no children', () => {
  assert.equal(div({ props: { textContent: 'hi' } }).textContent, 'hi');
  assert.equal(div({ props: { innerHTML: '<b>x</b>' } }).innerHTML, '<b>x</b>');
});

test('on* attributes are never offered to plugins', () => {
  const offered = [];
  use({ name: 'recorder', order: 'pre', bind: (value, apply, context) => void offered.push(context.name) });
  div({ attributes: { onclick: 'go()', title: 't' } });
  use({ name: 'recorder', bind: () => false });

  assert.deepEqual(offered, ['title']);
});

test('a plugin that binds a child without applying it yet still gets a place', () => {
  const later = { isLater: true };
  let applyLater;
  use({ name: 'later', bind: (value, apply) => value === later && ((applyLater = apply), true) });
  const el = div({ children: [later, 'b'] });

  applyLater('hello');

  assert.equal(el.innerHTML, 'hellob');
});

test('a text node passed in by the caller is not overwritten', () => {
  const mine = document.createTextNode('mine');
  const content = signal(mine);
  const el = div({ children: content });

  content.set('changed');

  assert.equal(mine.data, 'mine');
  assert.equal(el.textContent, 'changed');
});

test('an error while inserting a resolved promise child is logged', async (t) => {
  const error = t.mock.method(console, 'error', () => {});
  div({ children: Promise.resolve({ nodeType: 1 }) });
  await new Promise((resolve) => setTimeout(resolve));

  assert.equal(error.mock.callCount(), 1);
});

test('false keeps the attribute only for aria-*, data-* and enumerated attributes', () => {
  const el = div({ attributes: { 'aria-expanded': false, 'data-open': false, draggable: false, 'http-equiv': false } });
  const shape = svg.circle({ attributes: { 'stroke-dasharray': false } });

  assert.equal(el.getAttribute('aria-expanded'), 'false');
  assert.equal(el.getAttribute('data-open'), 'false');
  assert.equal(el.getAttribute('draggable'), 'false');
  assert.equal(el.hasAttribute('http-equiv'), false);
  assert.equal(shape.hasAttribute('stroke-dasharray'), false);
});

test('undefined props leave the property unchanged', () => {
  assert.equal(div({ props: { title: undefined } }).title, '');
});
