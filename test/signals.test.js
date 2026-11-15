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

const collected = async (ref) => {
  for (let i = 0; i < 10 && ref.deref(); i++) {
    await tick();
    globalThis.gc();
  }
  return ref.deref() === undefined;
};

test('an element inserted and removed in the same task stops updating', async () => {
  const count = state(1);
  let reads = 0;
  const el = div({ children: () => (reads++, count.get()) });
  document.body.append(el);
  el.remove();
  await tick();

  count.set(2);

  assert.equal(reads, 1);
  assert.equal(el.textContent, '1');
});

test('an element that is removed and inserted again resumes its bindings', async () => {
  const count = state(1);
  const el = div({ children: count });
  document.body.append(el);
  await tick();
  el.remove();
  await tick();
  count.set(2);
  assert.equal(el.textContent, '1');

  document.body.append(el);
  await tick();
  assert.equal(el.textContent, '2');
  count.set(3);
  assert.equal(el.textContent, '3');
  el.remove();
});

test('a dropped element that was never inserted can be collected', async () => {
  let count = state(1);
  let el = div({ children: count });
  const ref = new WeakRef(el);
  el = undefined;
  count = undefined;

  assert.equal(await collected(ref), true);
});

test('a computed without readers lets go of its sources', async () => {
  const source = state(1);
  let derived = computed(() => ({ buffer: new Uint8Array(1024), value: source.get() }));
  const ref = new WeakRef(derived);
  const stop = effect(() => derived.get());
  stop();
  derived = undefined;

  assert.equal(await collected(ref), true);
});

test('each renders repeated keys once per occurrence', () => {
  const items = state(['a', 'a']);
  const list = div({ children: each(items, (item) => span({ children: item })) });

  items.set(['a', 'a', 'b']);

  assert.equal(list.children.length, 3);
  assert.equal(list.textContent, 'aab');
});

test('each stops its rows when the surrounding effect replaces them', () => {
  const show = state(true);
  const label = state('row');
  const items = state([1]);
  const panel = div({
    children: () => (show.get() ? div({ children: each(items, (item) => span({ children: () => `${label.get()} ${item}` })) }) : 'hidden'),
  });
  const row = panel.querySelector('span');

  show.set(false);
  label.set('changed');

  assert.equal(row.textContent, 'row 1');
});

test('an effect that throws does not stop the other effects', () => {
  const count = state(1);
  const seen = [];
  effect(() => {
    if (count.get() === 2) throw new Error('first failed');
  });
  effect(() => seen.push(count.get()));

  assert.throws(() => count.set(2), /first failed/);
  assert.deepEqual(seen, [1, 2]);
});

test('an effect that keeps setting what it reads is stopped with an error', () => {
  const count = state(0);
  effect(() => {
    if (count.get() > 0) count.set(count.get() + 1);
  });

  assert.throws(() => count.set(1), /ran more than 100 times/);
});

test('an effect stopped during its own run is cleaned up', () => {
  const count = state(1);
  let runs = 0;
  let cleanups = 0;
  let stop;
  stop = effect(() => {
    runs++;
    if (count.get() === 2) stop();
    return () => cleanups++;
  });

  count.set(2);
  count.set(3);

  assert.equal(runs, 2);
  assert.equal(cleanups, 2);
});
