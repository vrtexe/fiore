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

/** Minimal signal used to exercise the plugin hook; like real signals it is not a plain object. */
const signalPrototype = { isSignal: true };
function signal(value) {
  const subscribers = new Set();
  return {
    __proto__: signalPrototype,
    get: () => value,
    set(next) {
      value = next;
      subscribers.forEach((apply) => apply(next));
    },
    subscribe: (apply) => subscribers.add(apply),
  };
}

const contexts = [];
const html = (el) => el.innerHTML.replaceAll('<!---->', '');
const region = (marker) => {
  const nodes = [];
  for (let node = marker.nextSibling; node.nodeType !== 8; node = node.nextSibling) nodes.push(node);
  return nodes;
};
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
  const el = element('video')({ props: { srcObject: stream, style: { height: '10px' } } });

  assert.equal(el.srcObject, stream);
  assert.equal(el.style.height, '10px');
});

test('attributes keep 0 and empty strings, drop false and null, and keep "false" for aria-*', () => {
  const el = div({
    attrs: { tabindex: 0, title: '', hidden: false, lang: null, 'aria-expanded': false },
  });

  assert.equal(el.getAttribute('tabindex'), '0');
  assert.equal(el.getAttribute('title'), '');
  assert.equal(el.hasAttribute('hidden'), false);
  assert.equal(el.hasAttribute('lang'), false);
  assert.equal(el.getAttribute('aria-expanded'), 'false');
});

test('children accept strings, numbers, nodes and arrays', () => {
  const el = div({ children: ['a', document.createElement('b'), 'c'] });

  assert.equal(html(el), 'a<b></b>c');
  assert.equal(div({ children: 'only' }).textContent, 'only');
});

test('a plugin can bind properties and attributes', () => {
  const value = signal('first');
  const label = signal('Open');
  const el = input({ props: { value }, attrs: { 'aria-label': label } });

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
  assert.equal(html(el), '[<i></i>x]');

  content.set(null);
  assert.equal(html(el), '[]');

  content.set(document.createElement('b'));
  assert.equal(html(el), '[<b></b>]');
});

test('a bound child keeps and reorders nodes it returns again', () => {
  const [a, b, c] = ['a', 'b', 'c'].map((tag) => document.createElement(tag));
  const rows = signal([a, b, c]);
  const el = div({ children: ['<', rows, '>'] });
  const focusLike = b;

  rows.set([c, a, b]);
  assert.equal(html(el), '&lt;<c></c><a></a><b></b>&gt;');
  assert.equal(el.querySelector('b'), focusLike);

  rows.set([a]);
  assert.equal(html(el), '&lt;<a></a>&gt;');
});

test('registering a plugin name again replaces the earlier plugin', () => {
  const marker = { __proto__: { isMarker: true } };
  use({ name: 'marker', bind: (value, apply) => value === marker && (apply('first'), true) });
  use({ name: 'marker', bind: (value, apply) => value === marker && (apply('second'), true) });

  assert.equal(div({ children: marker }).textContent, 'second');
});

test('plugins are asked in the order they were registered and the first that binds wins', () => {
  const shared = { __proto__: { isShared: true } };
  const claim = (text) => (value, apply) => value === shared && (apply(text), true);
  use({ name: 'first', bind: claim('first') });
  use({ name: 'second', bind: claim('second') });

  assert.equal(div({ children: shared }).textContent, 'first');
});

test('primitives, plain objects and nodes are never offered to plugins', () => {
  const before = contexts.length;
  const offered = [];
  use({ name: 'everything', bind: (value) => void offered.push(value) });
  const el = div({
    props: { title: 't', hidden: true, style: { color: 'red' } },
    attrs: { role: 'note', 'data-n': 1 },
    children: ['a', 1, span(), { text: 'b' }],
  });
  use({ name: 'everything', bind: () => false });

  assert.deepEqual(offered, []);
  assert.equal(contexts.length, before);
  assert.equal(el.style.color, 'red');
  assert.equal(el.textContent, 'a1[object Object]');
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
    assert.equal(div({ props: { className: 'card' }, attrs: { role: 'note' } }).id, '');
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
  const before = contexts.length;
  const el = div({
    attrs: { onclick: signal('go()'), OnClick: signal('go()'), online: signal('yes'), title: signal('t') },
    props: { onclick: () => {} },
  });

  assert.deepEqual(contexts.slice(before).map((context) => context.name), ['online', 'title']);
  assert.equal(el.hasAttribute('onclick'), false);
  assert.equal(el.getAttribute('online'), 'yes');
});

test('a plugin that binds a child without applying it yet still gets a place', () => {
  const later = { __proto__: { isLater: true } };
  let applyLater;
  use({ name: 'later', bind: (value, apply) => value === later && ((applyLater = apply), true) });
  const el = div({ children: [later, 'b'] });

  applyLater('hello');

  assert.equal(html(el), 'hellob');
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
  const el = div({ attrs: { 'aria-expanded': false, 'data-open': false, draggable: false, 'http-equiv': false } });
  const shape = svg.circle({ attrs: { 'stroke-dasharray': false } });

  assert.equal(el.getAttribute('aria-expanded'), 'false');
  assert.equal(el.getAttribute('data-open'), 'false');
  assert.equal(el.getAttribute('draggable'), 'false');
  assert.equal(el.hasAttribute('http-equiv'), false);
  assert.equal(shape.hasAttribute('stroke-dasharray'), false);
});

test('nested plain objects are merged after the other keys of their level', () => {
  const order = [];
  const probe = {
    set inner(value) {
      order.push('nested');
    },
  };
  const proto = window.HTMLElement.prototype;
  Object.defineProperty(proto, 'probe', { get: () => probe, configurable: true });
  Object.defineProperty(proto, 'flat', { set: () => order.push('flat'), configurable: true });
  try {
    div({ props: { probe: { inner: 1 }, flat: 2 } });
  } finally {
    delete proto.probe;
    delete proto.flat;
  }

  assert.deepEqual(order, ['flat', 'nested']);
});

test('a later undefined in the builder replaces an earlier value', () => {
  assert.equal(div.props({ title: 'a' }).props({ title: undefined }).create().title, '');
});

test('a nested children array is not flattened', () => {
  assert.equal(div({ children: [['a', 'b'], 'c'] }).textContent, 'a,bc');
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
    element('iframe')({ attrs: { srcdoc: trusted } });
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
  assert.equal(html(el), '<a></a><b></b>');
  rows.set([b, a]);
  rows.set(null);
  assert.equal(html(el), '');
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
  const before = contexts.length;
  const el = div({ props: { title: signal('t'), style: { color: signal('red') } } });

  assert.deepEqual(contexts.slice(before).map((context) => context.path.join('.')), ['title', 'style.color']);
  assert.equal(el.style.color, 'red');
});

test('value, selectedIndex and checked are applied after attributes and children', () => {
  const size = select({ props: { value: 'b' }, children: [option({ children: 'a' }), option({ children: 'b' })] });
  const range = input({ props: { type: 'range', value: '150' }, attrs: { max: '200' } });

  assert.equal(size.value, 'b');
  assert.equal(range.value, '150');
});

test('a very deep bound array does not overflow the stack', () => {
  let deep = 'x';
  for (let i = 0; i < 20000; i++) deep = [deep];

  assert.equal(div({ children: signal(deep) }).textContent, 'x');
});

test('plugins get the comment before the nodes of a child as its anchor, or the element for an only child', () => {
  const before = contexts.length;
  const only = div({ children: signal('a') });
  div({ children: ['<', signal('b')] });
  const [lone, withSibling] = contexts.slice(before);

  assert.equal(lone.anchor, only);
  assert.equal(withSibling.anchor.nodeType, 8);
  assert.equal(withSibling.anchor.nextSibling.data, 'b');
});

test('an only live child fills the element without markers', () => {
  const content = signal('a');
  const el = div({ children: content });
  assert.equal(el.childNodes.length, 1);

  content.set([span(), span()]);
  assert.equal(el.innerHTML, '<span></span><span></span>');

  content.set('b');
  assert.equal(el.innerHTML, 'b');

  el.replaceChildren();
  content.set('c');
  assert.equal(el.innerHTML, 'c', 'the element bounds the child, so it is filled again');
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

  content.set('d');
  assert.equal(el.textContent, '<d>');
});

test('a live text child keeps updating after normalize() merges its text with its neighbours', () => {
  const count = signal('one');
  const el = div({ children: ['Count: ', count, '!'] });

  el.normalize();
  count.set('two');

  assert.equal(el.textContent, 'Count: two!');
});

test('a live child inside a fragment that is the value of another live child keeps updating', () => {
  const inner = signal('a');
  const fragment = document.createDocumentFragment();
  fragment.append(...div({ children: [inner, 'x'] }).childNodes);
  const outer = signal(fragment);
  const el = div({ children: ['[', outer, ']'] });

  inner.set('b');
  assert.equal(el.textContent, '[bx]');

  outer.set('gone');
  assert.equal(el.textContent, '[gone]');
});

test('a live child that no plugin binds is shown as text and leaves no markers', () => {
  const el = div({ children: ['a', () => 1, new (class { toString = () => 'obj'; })(), 'z'] });

  assert.equal(el.textContent, 'a() => 1objz');
  assert.equal(el.childNodes.length, 4);
});

test('an only live child reorders its nodes in place', () => {
  const [a, b, c, d] = ['a', 'b', 'c', 'd'].map((tag) => document.createElement(tag));
  const content = signal([a, b, c]);
  const el = div({ children: content });

  content.set([c, a]);
  assert.deepEqual([...el.childNodes], [c, a]);

  content.set([d, c, a, b]);
  assert.deepEqual([...el.childNodes], [d, c, a, b]);

  content.set([b, d, a]);
  assert.deepEqual([...el.childNodes], [b, d, a]);
});

test('a live text replaced by another node, as page translation does, still updates', () => {
  const count = signal('one');
  const only = signal('one');
  const el = div({ children: ['Count: ', count] });
  const lone = div({ children: only });
  for (const host of [el, lone]) {
    const text = [...host.childNodes].find((node) => node.nodeType === 3 && node.data === 'one');
    const font = document.createElement('font');
    font.textContent = 'ONE';
    text.replaceWith(font);
  }

  count.set('two');
  only.set('two');

  assert.equal(el.textContent, 'Count: two');
  assert.equal(lone.textContent, 'two');
});

test('a live child taken out of its element ignores later updates', () => {
  const content = signal('a');
  const el = div({ children: ['<', content] });
  el.replaceChildren();

  assert.doesNotThrow(() => content.set([span()]));
  assert.equal(el.childNodes.length, 0);
});

test('a live child whose end marker was removed stops updating and removes nothing', () => {
  const content = signal([span()]);
  const el = div({ children: ['a', content, 'z'] });
  el.childNodes[3].remove();

  content.set([document.createElement('i')]);

  assert.equal(html(el), 'a<span></span>z');
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
    slots.forEach((slot, i) => assert.deepEqual(tokens(region(slot.anchor)), text(expected[i]), message));
  }
});

test('html, svg, MathML and deprecated elements handle props, attributes, children and listeners alike', () => {
  const factories = { html: div, svg: svg.g, math: math.mrow, deprecated: (data) => deprecatedElement('marquee')(data) };

  for (const [name, create] of Object.entries(factories)) {
    let clicks = 0;
    const el = create({
      props: { id: 'x', dataset: { step: '2' } },
      attrs: { 'aria-label': 'label', hidden: false },
      children: ['a', span({ children: 'b' }), 0],
      on: { click: () => clicks++ },
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

test('a plain call takes a plain object as the data object and anything else as children', () => {
  const count = signal(1);

  assert.equal(span().childNodes.length, 0);
  assert.equal(span(null).childNodes.length, 0);
  assert.equal(span('Hello').textContent, 'Hello');
  assert.equal(span([span('Hi'), ' there']).textContent, 'Hi there');
  assert.equal(span({ children: 'data' }).textContent, 'data');
  assert.equal(span({}).childNodes.length, 0);
  // A live value is not a plain object, so it is a child.
  const live = span(count);
  count.set(2);
  assert.equal(live.textContent, '2');
});

test('the builder applies props, attrs, children, late props, listeners and callbacks in a fixed order', () => {
  const seen = [];
  const build = (chain) =>
    chain(select)
      .also((el) => {
        el.dispatchEvent(new window.Event('change'));
        seen.push([el.value, el.getAttribute('name'), el.className]);
      })
      .create([option('S'), option('M')]);
  const listen = { change: (event) => seen.push(['listener', event.currentTarget.value]) };

  build((tag) => tag.on(listen).attrs({ name: 'size' }).props({ value: 'M', className: 'pick' }));
  build((tag) => tag.props({ value: 'M', className: 'pick' }).attrs({ name: 'size' }).on(listen));

  const expected = [['listener', 'M'], ['M', 'size', 'pick']];
  assert.deepEqual(seen, [...expected, ...expected]);
});

test('repeated builder calls combine props and attrs with later keys winning, and add listeners and callbacks', () => {
  const clicks = [];
  const order = [];
  const el = div
    .props({ className: 'a', style: { color: 'red', margin: '1px' } })
    .props({ className: 'b', style: { color: 'blue' } })
    .attrs({ title: 'one', role: 'note' })
    .attrs({ title: null })
    .on({ click: () => clicks.push(1) })
    .on({ click: () => clicks.push(2) })
    .also(() => order.push('first'))
    .also(() => order.push('second'))
    .create();
  el.dispatchEvent(new window.Event('click'));

  assert.equal(el.className, 'b');
  assert.equal(el.style.color, 'blue');
  assert.equal(el.style.margin, '', 'a later style object replaces the earlier one');
  assert.equal(el.hasAttribute('title'), false);
  assert.equal(el.getAttribute('role'), 'note');
  assert.deepEqual(clicks, [1, 2]);
  assert.deepEqual(order, ['first', 'second']);
});

test('builders are immutable templates and copy maps when they are called', () => {
  const map = { className: 'card' };
  const card = div.props(map);
  map.className = 'changed';
  const marked = card.attrs({ 'data-marked': '' });

  const plain = card.create('A');
  const special = marked.create('B');

  assert.equal(plain.className, 'card');
  assert.equal(plain.hasAttribute('data-marked'), false);
  assert.equal(special.className, 'card');
  assert.equal(special.hasAttribute('data-marked'), true);
  assert.equal(div.create().className, '', 'a tag method starts from an empty builder each time');
});

test('with applies a modifier, and create takes children like the data object', () => {
  const card = (b) => b.props({ className: 'card' });
  const admin = (b) => (b.attrs({ 'data-admin': '' }));
  const el = div.with(card).with((b) => (false ? admin(b) : b)).create([span('a'), false && 'x', null, 'b', 1]);

  assert.equal(el.className, 'card');
  assert.equal(el.hasAttribute('data-admin'), false);
  assert.equal(el.textContent, 'ab1');
  assert.equal(div.create(span('only')).textContent, 'only');
  assert.equal(div.create('text').textContent, 'text');
  assert.equal(div.create(null).childNodes.length, 0);
});

test('a live prop in a template binds once per created element', () => {
  const label = signal('one');
  const template = div.props({ title: label });
  const first = template.create();
  const second = template.create();
  label.set('two');

  assert.deepEqual([first.title, second.title], ['two', 'two']);
});

test('element() returns a working tag for a name, in each namespace', () => {
  assert.equal(element('div').props({ id: 'x' }).create().id, 'x');
  assert.equal(svg.element('circle')().namespaceURI, 'http://www.w3.org/2000/svg');
  assert.equal(math.element('mi')().namespaceURI, 'http://www.w3.org/1998/Math/MathML');
});

test('nested props merge into existing objects with a stack, at any depth', () => {
  let existing = { leaf: 'old' };
  let update = { leaf: 'new' };
  for (let i = 0; i < 20000; i++) {
    existing = { next: existing };
    update = { next: update };
  }
  const el = element('div').also((node) => (node.config = existing)).create();
  assignProperties(el, { config: update });

  let level = el.config;
  while (level.next) level = level.next;
  assert.equal(level.leaf, 'new');
  assert.equal(el.config, existing, 'the existing object is kept and merged into');
});

test('a cyclic value merged into a cyclic property ends instead of looping', () => {
  const input = { mode: 'on' };
  input.self = input;
  const el = element('div')
    .also((node) => {
      node.cfg = { mode: 'off' };
      node.cfg.self = node.cfg;
    })
    .create();
  assignProperties(el, { cfg: input });

  assert.equal(el.cfg.mode, 'on');
  assert.equal(el.cfg.self, input, 'the second visit assigns the value whole');
});
