import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';

const { window } = new JSDOM();
Object.assign(globalThis, { document: window.document, Node: window.Node, Event: window.Event });

const { a, div, span, td, tr, blueprint, LIVE } = await import('../lib/html.js');

/** A minimal live value: applies its value now and on every set. */
function signal(value) {
  const subscribers = new Set();
  return {
    get: () => value,
    set(next) {
      value = next;
      subscribers.forEach((apply) => apply(value));
    },
    [LIVE](apply) {
      apply(value);
      subscribers.add(apply);
    },
  };
}

const row = (slot) =>
  tr.props({ className: slot.danger }).create([
    td.props({ className: 'col-md-1' }).create(slot.id),
    td.props({ className: 'col-md-4' }).create(a.on({ click: slot.select }).create(slot.label)),
    td.props({ className: 'col-md-1' }).create(
      a.on({ click: slot.remove }).create(span.attrs({ class: 'glyphicon glyphicon-remove', 'aria-hidden': 'true' }).create()),
    ),
    td.props({ className: 'col-md-6' }).create(),
  ]);

test('a copy has the same HTML as the normal build', () => {
  const Row = blueprint(row);
  const values = { danger: '', id: 7, label: 'seven', select: () => {}, remove: () => {} };
  assert.equal(Row(values).outerHTML, row(values).outerHTML);
  assert.equal(Row({ ...values, id: 8, label: 'eight' }).outerHTML, row({ ...values, id: 8, label: 'eight' }).outerHTML);
});

test('build runs once, and every copy is a separate element', () => {
  let builds = 0;
  const View = blueprint((slot) => {
    builds++;
    return div.create(slot.text);
  });
  const first = View({ text: 'a' });
  const second = View({ text: 'b' });
  assert.equal(builds, 1);
  assert.notEqual(first, second);
  assert.deepEqual([first.textContent, second.textContent], ['a', 'b']);
});

test('live props, attributes and children update their own copy only', () => {
  const View = blueprint((slot) => div.props({ className: slot.cls }).attrs({ title: slot.title }).create(slot.text));
  const cls = signal('x');
  const title = signal('t1');
  const text = signal('one');
  const live = View({ cls, title, text });
  const fixed = View({ cls: 'y', title: 't2', text: 'two' });
  cls.set('z');
  title.set(null);
  text.set('ONE');
  assert.equal(live.className, 'z');
  assert.equal(live.hasAttribute('title'), false);
  assert.equal(live.textContent, 'ONE');
  assert.deepEqual([fixed.className, fixed.getAttribute('title'), fixed.textContent], ['y', 't2', 'two']);
});

test('listener slots attach the handler of each copy, with options', () => {
  const View = blueprint((slot) => a.on({ click: slot.click, focus: { handler: slot.focus, options: { once: true } } }).create('x'));
  const calls = [];
  const first = View({ click: () => calls.push('first'), focus: () => calls.push('focus') });
  const second = View({ click: () => calls.push('second'), focus: () => {} });
  first.dispatchEvent(new Event('click'));
  second.dispatchEvent(new Event('click'));
  first.dispatchEvent(new Event('focus'));
  first.dispatchEvent(new Event('focus'));
  assert.deepEqual(calls, ['first', 'second', 'focus']);
});

test('a child slot among other children keeps markers only for live values', () => {
  const View = blueprint((slot) => div.create(['before ', slot.middle, span.create('after')]));
  const fixed = View({ middle: 'fixed ' });
  assert.equal(fixed.innerHTML, 'before fixed <span>after</span>');
  const middle = signal('live ');
  const live = View({ middle });
  middle.set('changed ');
  assert.equal(live.textContent, 'before changed after');
});

test('nested props and also callbacks apply to each copy', () => {
  const seen = [];
  const View = blueprint((slot) =>
    div
      .props({ style: { color: slot.color } })
      .also((element) => seen.push(element))
      .create(),
  );
  const first = View({ color: 'red' });
  const second = View({ color: 'blue' });
  assert.equal(first.style.color, 'red');
  assert.equal(second.style.color, 'blue');
  assert.deepEqual(seen, [first, second]);
});
