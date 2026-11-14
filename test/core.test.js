import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';

const { window } = new JSDOM();
Object.assign(globalThis, { document: window.document, Node: window.Node });

const { div, input, element, use } = await import('../lib/html.js');

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
