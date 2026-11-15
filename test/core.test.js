import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { JSDOM } from 'jsdom';

const { window } = new JSDOM();
Object.assign(globalThis, { document: window.document, Node: window.Node });

const { div, input, element, use } = await import('../lib/html.js');
const { default: math } = await import('../lib/math.js');
const { default: svg } = await import('../lib/svg.js');
const { assignProperties } = await import('../lib/core/base.js');
const { deprecatedElement } = await import('../lib/core/html.js');
const { option, select, span } = await import('../lib/html.js');

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
    [['attribute', 'aria-label'], ['property', 'value']],
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

    // A full reverse keeps the old last node in place, so the nodes moved are the cheap ones.
    const moved = new Set();
    moves = 0;
    Node.prototype.insertBefore = function (node, anchor) {
      moves++;
      moved.add(node);
      return insertBefore.call(this, node, anchor);
    };
    const reversed = [...rotated].reverse();
    rows.set(reversed);
    assert.equal(moves, 99);
    assert.equal(moved.has(rotated.at(-1)), false);
    assert.deepEqual([...el.children], reversed);
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

test('inline handler attributes are never set or offered to plugins, in any case; other on* names are', () => {
  const offered = [];
  use({ name: 'recorder', order: 'pre', bind: (value, apply, context) => void offered.push(context.name) });
  const el = div({
    attributes: { onclick: 'go()', OnClick: 'go()', online: 'yes', title: 't' },
    props: { onclick: () => {} },
  });
  use({ name: 'recorder', bind: () => false });

  assert.deepEqual(offered, ['online', 'title']);
  assert.equal(el.hasAttribute('onclick'), false);
  assert.equal(el.getAttribute('online'), 'yes');
});

test('a plugin that binds a child without applying it yet still gets a place', () => {
  const later = { isLater: true };
  let applyLater;
  use({ name: 'later', bind: (value, apply) => value === later && ((applyLater = apply), true) });
  const el = div({ children: [later, 'b'] });

  applyLater('hello');

  assert.equal(el.innerHTML, 'hellob');
});

test('a text node passed in by the caller is not overwritten, also inside a fragment', () => {
  const mine = document.createTextNode('mine');
  const inFragment = document.createTextNode('fragment');
  const fragment = document.createDocumentFragment();
  fragment.append(inFragment);
  const content = signal(mine);
  const el = div({ children: content });

  content.set('changed');
  content.set(fragment);
  content.set('again');

  assert.equal(mine.data, 'mine');
  assert.equal(inFragment.data, 'fragment');
  assert.equal(el.textContent, 'again');
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

test('attribute values reach setAttribute unchanged, so Trusted Types objects keep working', () => {
  const trusted = { toString: () => '<p>x</p>' };
  const calls = [];
  const setAttribute = window.Element.prototype.setAttribute;
  window.Element.prototype.setAttribute = function (name, value) {
    calls.push(value);
    return setAttribute.call(this, name, value);
  };
  try {
    element('iframe', { attributes: { srcdoc: trusted } });
  } finally {
    window.Element.prototype.setAttribute = setAttribute;
  }

  assert.equal(calls[0], trusted);
});

test('a node repeated in a bound list is kept once and later updates still work', () => {
  const [a, b] = ['a', 'b'].map((tag) => document.createElement(tag));
  const rows = signal(null);
  const el = div({ children: rows });

  rows.set([a, b, a]);
  assert.equal(el.innerHTML, '<a></a><b></b>');
  rows.set([b, a]);
  rows.set(null);
  assert.equal(el.innerHTML, '');
});

test('moveBefore is used for moves when the browser has it', () => {
  const nodes = ['a', 'b', 'c'].map((tag) => document.createElement(tag));
  const rows = signal(nodes);
  const el = div({ children: rows });
  document.body.append(el);
  let moved = 0;
  Node.prototype.moveBefore = function (node, anchor) {
    moved++;
    return this.insertBefore(node, anchor);
  };
  try {
    rows.set([nodes[2], nodes[0], nodes[1]]);
  } finally {
    delete Node.prototype.moveBefore;
    el.remove();
  }

  assert.equal(moved, 1);
  assert.deepEqual([...el.children], [nodes[2], nodes[0], nodes[1]]);
});

test('a bound property update does not read the current value first', () => {
  const title = signal('a');
  const el = div({ props: { title } });
  let reads = 0;
  Object.defineProperty(el, 'title', { get: () => (reads++, ''), set() {}, configurable: true });

  title.set('b');

  assert.equal(reads, 0);
});

test('use() requires a plugin name that is a non-empty string', () => {
  for (const name of [undefined, '', 42]) {
    assert.throws(() => use({ name, bind: () => false }), /needs a plugin with a name/);
  }
});

test('objects from another window are replaced, not merged into', () => {
  const el = div();
  const foreign = runInNewContext('({ title: "frame" })');
  el.frame = foreign;

  assignProperties(el, { frame: { title: 'pwned' } });

  assert.notEqual(el.frame, foreign);
  assert.equal(foreign.title, 'frame');
});

test('objects without a prototype are replaced, not merged into', () => {
  const el = div();
  const bare = Object.create(null);
  el.bag = bare;

  assignProperties(el, { bag: { x: 1 } });

  assert.notEqual(el.bag, bare);
});

test('nested keys that start with on are still offered to plugins', () => {
  const step = signal('2');
  const el = div({ props: { dataset: { onboardingStep: step } } });

  assert.equal(el.dataset.onboardingStep, '2');
});

test('a very long child list does not overflow the argument limit', () => {
  for (const length of [10000, 10001, 200000]) {
    const items = Array.from({ length }, (_, i) => document.createElement(i % 2 ? 'b' : 'i'));
    const el = div({ props: { textContent: 'old' }, children: items });

    assert.equal(el.childNodes.length, length);
    assert.equal(el.firstChild, items[0]);
    assert.equal(el.lastChild, items.at(-1));
  }
});

test('plugins get the full path of nested props', () => {
  const paths = [];
  use({ name: 'paths', order: 'pre', bind: (value, apply, context) => void (context.kind === 'property' && paths.push(context.path.join('.'))) });
  div({ props: { style: { color: 'red' } } });
  use({ name: 'paths', bind: () => false });

  assert.deepEqual(paths, ['style', 'style.color']);
});

test('value, selectedIndex and checked are applied after attributes and children', () => {
  const size = select({ props: { value: 'b' }, children: [option({ children: 'a' }), option({ children: 'b' })] });
  const range = input({ props: { type: 'range', value: '150' }, attributes: { max: '200' } });

  assert.equal(size.value, 'b');
  assert.equal(range.value, '150');
});

test('a very deep bound array does not overflow the stack', () => {
  let deep = 'x';
  for (let i = 0; i < 20000; i++) deep = [deep];

  assert.equal(div({ children: signal(deep) }).textContent, 'x');
});

test('plugins can read the nodes a child currently occupies', () => {
  let context;
  const marker = { isMarker: true };
  use({ name: 'nodes', bind: (value, apply, ctx) => value === marker && ((context = ctx), apply('hi'), true) });
  div({ children: marker });

  assert.equal(context.nodes()[0].data, 'hi');
});

test('a plain object with a nodeType key does not break a live child', () => {
  const content = signal('a');
  const el = div({ children: content });

  assert.doesNotThrow(() => content.set({ nodeType: 1, id: 'x' }));
  content.set('d');

  assert.equal(el.textContent, 'd');
});

test('an insert that throws leaves the slot as it was, and later updates still apply', () => {
  const [a, b] = ['a', 'b'].map((tag) => document.createElement(tag));
  const content = signal([a, b]);
  const el = div({ children: ['<', content, '>'] });
  const outer = div({ children: el });

  assert.throws(() => content.set([b, 'new', outer]));
  assert.equal(el.innerHTML, '&lt;<a></a><b></b>&gt;');

  content.set('d');
  assert.equal(el.textContent, '<d>');
});

test('a node that moves to another bound child leaves the first one working', () => {
  const [c1, c2, c3] = ['c1', 'c2', 'c3'].map((text) => span({ children: text }));
  const a = signal([c1, c2]);
  const b = signal([c3]);
  const columnA = div({ children: a });
  const columnB = div({ children: b });

  // The column that takes the card updates first.
  b.set([c3, c2]);
  a.set([c1]);
  assert.deepEqual([columnA.textContent, columnB.textContent], ['c1', 'c3c2']);
  a.set([c1, 'x']);
  assert.deepEqual([columnA.textContent, columnB.textContent], ['c1x', 'c3c2']);

  // The moved card was the column's only node.
  a.set([c1]);
  b.set([c3, c1]);
  assert.deepEqual([columnA.textContent, columnB.textContent], ['', 'c3c1']);
  a.set(['3', '5']);
  assert.deepEqual([columnA.textContent, columnB.textContent], ['35', 'c3c1']);
});

test('bound children stay correct under random updates that move nodes between them', () => {
  // mulberry32, so a failure can be reproduced from the seed.
  let seed = 20261115;
  const random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pick = (n) => Math.floor(random() * n);

  const pool = Array.from({ length: 6 }, (_, i) => span({ children: `n${i}` }));
  const signals = [signal(null), signal(null), signal(null)];
  const first = contexts.length;
  const one = div({ children: ['[', signals[0], '|', signals[1], ']'] });
  const two = div({ children: ['(', signals[2], ')'] });
  const slots = contexts.slice(first).filter((context) => context.kind === 'child');
  /** @type {(Node | string)[][]} */
  const expected = [[], [], []];

  const tokens = (nodes) =>
    [...nodes].map((node) => node.textContent).filter((text) => text !== '');

  for (let step = 0; step < 2000; step++) {
    const target = pick(3);
    const kind = pick(5);
    let value;
    if (kind === 0) {
      value = null;
    } else if (kind === 1) {
      value = `t${step}`;
    } else {
      value = Array.from({ length: pick(5) }, () => (pick(4) === 0 ? `t${step}-${pick(9)}` : pool[pick(pool.length)]));
    }

    const items = value == null ? [] : [value].flat();
    const nodes = [...new Set(items.filter((item) => typeof item !== 'string'))];
    expected.forEach((list, i) => {
      if (i !== target) expected[i] = list.filter((item) => !nodes.includes(item));
    });
    expected[target] = items.filter((item, i) => typeof item === 'string' || items.indexOf(item) === i);
    signals[target].set(value);

    const text = (list) => list.map((item) => (typeof item === 'string' ? item : item.textContent));
    const message = `step ${step}`;
    assert.deepEqual(tokens(one.childNodes), ['[', ...text(expected[0]), '|', ...text(expected[1]), ']'], message);
    assert.deepEqual(tokens(two.childNodes), ['(', ...text(expected[2]), ')'], message);
    slots.forEach((slot, i) => assert.deepEqual(tokens(slot.nodes()), text(expected[i]), message));
  }
});

test('html, svg, MathML and deprecated elements handle props, attributes, children and listeners alike', () => {
  const factories = { html: div, svg: svg.g, math: math.mrow, deprecated: (data) => deprecatedElement('marquee', data) };

  for (const [name, create] of Object.entries(factories)) {
    let clicks = 0;
    const el = create({
      props: { id: 'x', dataset: { step: '2' } },
      attributes: { 'aria-label': 'label', hidden: false },
      children: ['a', span({ children: 'b' }), 0],
      event: { click: () => clicks++ },
    });
    el.dispatchEvent(new window.Event('click'));

    assert.equal(el.id, 'x', name);
    assert.equal(el.dataset.step, '2', name);
    assert.equal(el.getAttribute('aria-label'), 'label', name);
    assert.equal(el.hasAttribute('hidden'), false, name);
    assert.equal(el.textContent, 'ab0', name);
    assert.equal(clicks, 1, name);
  }
});
