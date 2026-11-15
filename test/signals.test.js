import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';

const { window } = new JSDOM();
Object.assign(globalThis, {
  document: window.document,
  Node: window.Node,
  MutationObserver: window.MutationObserver,
});

const { button, div, span, input } = await import('fiorejs');
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

test('a computed keeps its cache when its reader reruns for another reason', () => {
  const items = state([1, 2, 3]);
  const label = state('a');
  let runs = 0;
  const total = computed(() => (runs++, items.get().reduce((sum, n) => sum + n, 0)));
  const doubled = computed(() => total.get() * 2);
  effect(() => `${label.get()}: ${doubled.get()}`);

  label.set('b');
  label.set('c');

  assert.equal(runs, 1);
});

test('an effect whose first run throws is stopped', () => {
  const count = state(0);
  let runs = 0;
  assert.throws(() =>
    effect(() => {
      runs++;
      count.get();
      throw new Error('broken');
    }),
  );

  count.set(1);

  assert.equal(runs, 1);
});

test('a binding that fails while building leaves no subscriber behind', () => {
  const record = state(null);
  let reads = 0;
  assert.throws(() => div({ children: () => (reads++, record.get().missing.x) }));

  record.set({ missing: { x: 1 } });

  assert.equal(reads, 1);
});

test('a cleanup that throws does not stop the effect that owns it', () => {
  const count = state(0);
  let outerRuns = 0;
  effect(() => {
    outerRuns++;
    count.get();
    effect(() => () => {
      throw new Error('cleanup failed');
    });
  });

  assert.throws(() => count.set(1), /cleanup failed/);
  assert.throws(() => count.set(2), /cleanup failed/);

  assert.equal(outerRuns, 3);
});

test('a binding that fails on re-insertion does not stop its siblings', async (t) => {
  t.mock.method(console, 'error', () => {});
  if (typeof globalThis.reportError === 'function') t.mock.method(globalThis, 'reportError', () => {});
  const good = state('a');
  const fail = state(false);
  const wrapper = div({
    children: [span({ children: () => (fail.get() ? null.boom : 'ok') }), span({ children: good })],
  });
  document.body.append(wrapper);
  await tick();
  wrapper.remove();
  await tick();
  fail.set(true);

  document.body.append(wrapper);
  await tick();
  good.set('c');

  assert.equal(wrapper.lastChild.textContent, 'c');
  wrapper.remove();
});

test('a live object prop does not pile up bindings when it changes often', () => {
  const dark = state(false);
  const color = state('white');
  const box = div({ props: { style: () => (dark.get() ? { color } : { color: 'black' }) } });
  document.body.append(box);

  const measure = () => {
    globalThis.gc();
    return process.memoryUsage().heapUsed;
  };
  for (let i = 0; i < 2000; i++) dark.set(!dark.get());
  const before = measure();
  for (let i = 0; i < 20000; i++) dark.set(!dark.get());
  const growth = measure() - before;

  box.remove();
  assert.ok(growth < 1_500_000, `heap grew by ${growth} bytes`);
});

test('each keeps its rows when a render fails partway through', () => {
  const items = state([1, 2]);
  const label = state('a');
  let renders = 0;
  let reads = 0;
  const render = (item) => {
    renders++;
    if (item === 99) throw new Error('bad row');
    return span({ children: () => (reads++, `${label.get()}${item}`) });
  };
  div({ children: each(items, render) });

  assert.throws(() => items.set([1, 2, 99]), /bad row/);
  items.set([1, 2]);
  reads = 0;
  label.set('b');

  assert.equal(renders, 3);
  assert.equal(reads, 2);
});

test('a function in an on* attribute or prop is never called as a binding, in any case', () => {
  let calls = 0;
  button({ attributes: { OnClick: () => calls++ }, props: { ONCLICK: () => calls++ } });

  assert.equal(calls, 0);
});

test('a live child built elsewhere pauses when the place it moved to is removed', async () => {
  const count = state(1);
  let reads = 0;
  const holder = div({ children: () => (reads++, count.get()) });
  const section = div();
  section.append(...holder.childNodes);
  document.body.append(section);
  await tick();

  section.remove();
  await tick();
  count.set(2);

  assert.equal(reads, 1);
});

/** Collects errors sent to reportError (or console.error) while `fn` runs. */
async function reported(fn) {
  const errors = [];
  const previous = globalThis.reportError;
  const previousConsole = console.error;
  globalThis.reportError = (error) => errors.push(error);
  console.error = (error) => errors.push(error);
  try {
    await fn();
  } finally {
    globalThis.reportError = previous;
    console.error = previousConsole;
  }
  return errors;
}

test('readers of a computed recover after it threw once', () => {
  const text = state('{"a":1}');
  const parsed = computed(() => JSON.parse(text.get()).a);
  const seen = [];
  effect(() => {
    try {
      seen.push(parsed.get());
    } catch {
      seen.push('error');
    }
  });
  const label = span({ children: () => String(parsed.get()) });

  assert.throws(() => text.set('{bad'));
  text.set('{"a":9}');

  assert.deepEqual(seen, [1, 'error', 9]);
  assert.equal(label.textContent, '9');
});

test('a computed that throws without readers can be collected', async () => {
  const source = state(1);
  const make = () => {
    const payload = { big: new Uint8Array(1024) };
    const broken = computed(() => {
      source.get();
      if (payload) throw new Error('broken');
    });
    return { ref: new WeakRef(payload), broken };
  };
  let { ref, broken } = make();
  assert.throws(() => broken.get());
  broken = undefined;

  assert.equal(await collected(ref), true);
  source.set(2);
});

test('a binding whose cleanup throws while paused still resumes', async () => {
  const price = state(10);
  const panel = div({
    children: () => {
      effect(() => () => {
        throw new Error('cleanup failed');
      });
      return `CHF ${price.get()}`;
    },
  });
  document.body.append(panel);
  await tick();

  const errors = await reported(async () => {
    panel.remove();
    await tick();
  });
  price.set(99);
  document.body.append(panel);
  await tick();

  assert.equal(errors.length, 1);
  assert.equal(panel.textContent, 'CHF 99');
  panel.remove();
});

test('each still shows its new rows when a dropped row fails to stop', async () => {
  const items = state([1, 2]);
  const list = div({
    children: each(items, (item) => {
      if (item === 2) {
        effect(() => () => {
          throw new Error('row cleanup failed');
        });
      }
      return span({ children: String(item) });
    }),
  });

  const errors = await reported(() => items.set([1, 3]));

  assert.equal(list.textContent, '13');
  assert.equal(errors.length, 1);
});

test('a live child that starts with a comment pauses with its host', async () => {
  const count = state(1);
  let reads = 0;
  const host = div({ children: () => (reads++, [document.createComment('start'), `x${count.get()}`]) });
  document.body.append(host);
  await tick();

  host.remove();
  await tick();
  count.set(2);

  assert.equal(reads, 1);
});

test('an effect that stops itself and then throws leaves nothing running', () => {
  const count = state(0);
  let inner = 0;
  let stop;
  stop = effect(() => {
    if (count.get() === 1) {
      stop();
      effect(() => {
        inner++;
        count.get();
      });
      throw new Error('after stop');
    }
  });

  assert.throws(() => count.set(1), /after stop/);
  count.set(2);
  count.set(3);

  assert.equal(inner, 1);
});

test('a deep tree appended level by level is walked once', async () => {
  const host = div({ children: state('live') });
  document.body.append(host);
  await tick();
  const createTreeWalker = document.createTreeWalker;
  let steps = 0;
  document.createTreeWalker = function (...args) {
    const walker = createTreeWalker.apply(this, args);
    const nextNode = walker.nextNode.bind(walker);
    walker.nextNode = () => (steps++, nextNode());
    return walker;
  };
  try {
    let parent = host;
    for (let i = 0; i < 300; i++) {
      const child = document.createElement('div');
      parent.append(child);
      parent = child;
    }
    await tick();
  } finally {
    document.createTreeWalker = createTreeWalker;
    host.remove();
  }

  assert.ok(steps < 900, `walked ${steps} nodes for 300`);
});

test('a loop error does not hide the errors of other effects', async () => {
  const count = state(0);
  effect(() => {
    if (count.get() > 0) throw new Error('first failed');
  });
  effect(() => {
    if (count.get() > 0) count.set(count.get() + 1);
  });

  const errors = await reported(() => assert.throws(() => count.set(1), /first failed/));

  assert.ok(errors.some((error) => /ran more than 100 times/.test(String(error))));
});

test('fault injection: the app recovers after any one callback throws during updates', async () => {
  const points = ['computed', 'effect', 'cleanup', 'inner-cleanup', 'binding', 'render', 'row-cleanup'];
  for (const point of points) {
    let armed = false;
    const fail = (name) => {
      if (armed && name === point) throw new Error(`injected ${name}`);
    };

    const source = state(0);
    const derived = computed(() => (fail('computed'), source.get() * 2));
    const log = [];
    effect(() => {
      fail('effect');
      log.push(derived.get());
      effect(() => () => fail('inner-cleanup'));
      return () => fail('cleanup');
    });
    const label = div({ children: () => (fail('binding'), String(derived.get())) });
    const items = computed(() => [source.get(), source.get() + 1]);
    const list = div({
      children: each(items, (item) => {
        fail('render');
        effect(() => () => fail('row-cleanup'));
        return span({ children: String(item) });
      }),
    });
    document.body.append(label, list);
    await tick();

    armed = true;
    await reported(() => {
      for (const value of [1, 2]) {
        try {
          source.set(value);
        } catch {
          // the injected error, expected
        }
      }
    });
    armed = false;
    source.set(10);

    assert.equal(log.at(-1), 20, `${point}: effect`);
    assert.equal(label.textContent, '20', `${point}: binding`);
    assert.equal(list.textContent, '1011', `${point}: list`);
    label.remove();
    list.remove();
  }
});
