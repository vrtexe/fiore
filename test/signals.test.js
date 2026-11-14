import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';

const { window } = new JSDOM();
Object.assign(globalThis, {
  document: window.document,
  Node: window.Node,
  MutationObserver: window.MutationObserver,
});

const { div, span, input } = await import('fiorejs');
const { state, computed, effect, untrack, read, each } = await import('@fiorejs/signals');

const tick = () => new Promise((resolve) => setTimeout(resolve));

test('effects rerun when what they read changes, and stop cleanly', () => {
  const count = state(1);
  const seen = [];
  const cleanups = [];
  const stop = effect(() => {
    seen.push(count.get());
    return () => cleanups.push('cleanup');
  });

  count.set(2);
  count.set(2);
  stop();
  count.set(3);

  assert.deepEqual(seen, [1, 2]);
  assert.deepEqual(cleanups, ['cleanup', 'cleanup']);
});

test('update sets the value its function returns', () => {
  const count = state(1);
  const { update } = count;
  update((value) => value + 1);

  assert.equal(count.get(), 2);
});

test('mutate changes the value in place and always notifies', () => {
  const list = state([1, 2]);
  const lengths = [];
  effect(() => lengths.push(list.get().length));
  const before = list.get();

  list.mutate((items) => items.push(3));

  assert.equal(list.get(), before);
  assert.deepEqual(lengths, [2, 3]);
});

test('computed values are lazy, cached and consistent inside effects', () => {
  const count = state(1);
  let runs = 0;
  const double = computed(() => (runs++, count.get() * 2));
  assert.equal(runs, 0);

  const seen = [];
  effect(() => seen.push([count.get(), double.get()]));
  count.set(2);
  double.get();

  assert.equal(runs, 2);
  assert.deepEqual(seen, [[1, 2], [2, 4]]);
});

test('effects only follow the branch they took last', () => {
  const useA = state(true);
  const a = state('a');
  const b = state('b');
  let runs = 0;
  effect(() => (runs++, useA.get() ? a.get() : b.get()));

  b.set('b2');
  useA.set(false);
  a.set('a2');

  assert.equal(runs, 2);
});

test('untrack reads without subscribing', () => {
  const count = state(1);
  let runs = 0;
  effect(() => (runs++, untrack(() => count.get())));
  count.set(2);

  assert.equal(runs, 1);
});

test('read accepts plain values, signals and getters', () => {
  const count = state(2);

  assert.equal(read(1), 1);
  assert.equal(read(count), 2);
  assert.equal(read(() => count.get() + 1), 3);
});

test('signals and getters bind to properties, attributes and children', () => {
  const name = state('Ada');
  const onclick = () => 'clicked';
  const field = input({ props: { value: name, onclick }, attributes: { title: () => `Name: ${name.get()}` } });
  const label = div({ children: ['Hello ', name] });

  name.set('Grace');

  assert.equal(field.value, 'Grace');
  assert.equal(field.getAttribute('title'), 'Name: Grace');
  assert.equal(field.onclick, onclick);
  assert.equal(label.textContent, 'Hello Grace');
});

test('a getter child stops the bindings of what it replaced', () => {
  const show = state(true);
  const count = state(1);
  const panel = div({ children: () => (show.get() ? span({ children: count }) : 'hidden') });
  const inner = panel.firstChild;

  show.set(false);
  count.set(2);

  assert.equal(panel.textContent, 'hidden');
  assert.equal(inner.textContent, '1');
});

test('each reuses rows by key and stops the bindings of removed rows', () => {
  const label = state('item');
  const items = state([{ id: 1 }, { id: 2 }, { id: 3 }]);
  const list = div({
    children: each(items, (item) => span({ children: () => `${label.get()} ${item.id}` }), (item) => item.id),
  });
  const [one, two, three] = list.children;

  items.set([items.get()[2], items.get()[0]]);
  label.set('row');

  assert.deepEqual([...list.children], [three, one]);
  assert.equal(list.textContent, 'row 3row 1');
  assert.equal(two.textContent, 'item 2');
});

test('bindings stop after their element is removed from the document', async () => {
  const count = state(1);
  const el = div({ children: count });
  document.body.append(el);
  await tick();

  el.remove();
  await tick();
  count.set(2);

  assert.equal(el.textContent, '1');
});

test('elements that were never inserted keep their bindings', async () => {
  const count = state(1);
  const el = div({ children: count });
  document.body.append(div());
  await tick();

  count.set(2);

  assert.equal(el.textContent, '2');
});
