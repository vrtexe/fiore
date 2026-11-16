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
const { state, computed, effect, untrack, read, each, resource, classList } = await import('@fiorejs/signals');

const tick = () => new Promise((resolve) => setTimeout(resolve));

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
  const field = input({ props: { value: name, onclick }, attrs: { title: () => `Name: ${name.get()}` } });
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
  const inner = panel.firstElementChild;

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

test('an effect that throws is reported and stopped, and the other effects still run', async () => {
  const count = state(1);
  const seen = [];
  let failing = 0;
  effect(() => {
    failing++;
    if (count.get() === 2) throw new Error('first failed');
  });
  effect(() => seen.push(count.get()));

  const errors = await reported(() => count.set(2));
  count.set(3);

  assert.deepEqual(seen, [1, 2, 3]);
  assert.equal(failing, 2);
  assert.equal(errors.length, 1);
});

test('an effect that keeps setting what it reads is stopped with an error', async () => {
  const count = state(0);
  effect(() => {
    if (count.get() > 0) count.set(count.get() + 1);
  });

  const errors = await reported(() => count.set(1));

  assert.match(String(errors[0]), /ran more than 100 times/);
  count.set(1000);
  assert.equal(count.get(), 1000);
});

test('a looping effect does not keep the other effects from seeing the final value', async () => {
  const count = state(0);
  effect(() => {
    const value = count.get();
    if (value > 0 && value < 1000) count.set(value + 1);
  });
  const seen = [];
  effect(() => seen.push(count.get()));

  const errors = await reported(() => count.set(1));

  assert.equal(errors.length, 1);
  assert.equal(seen.at(-1), count.get());
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

test('an effect whose first run throws is reported and stopped', async () => {
  const count = state(0);
  let runs = 0;
  let stop;
  const errors = await reported(() => {
    stop = effect(() => {
      runs++;
      count.get();
      throw new Error('broken');
    });
  });

  count.set(1);
  stop();

  assert.equal(runs, 1);
  assert.equal(errors.length, 1);
});

test('a binding that fails while building is reported, leaves no subscriber behind and still builds the element', async () => {
  const record = state(null);
  let reads = 0;
  let element;
  const errors = await reported(() => {
    element = div({ children: () => (reads++, record.get().missing.x) });
  });

  record.set({ missing: { x: 1 } });

  assert.equal(reads, 1);
  assert.equal(errors.length, 1);
  assert.equal(element.tagName, 'DIV');
});

test('a cleanup that throws does not stop the effect that owns it', async () => {
  const count = state(0);
  let outerRuns = 0;
  effect(() => {
    outerRuns++;
    count.get();
    effect(() => () => {
      throw new Error('cleanup failed');
    });
  });

  const errors = await reported(() => {
    count.set(1);
    count.set(2);
  });

  assert.equal(outerRuns, 3);
  assert.equal(errors.length, 2);
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

test('signals under on* names bind, and functions under them are callbacks that are never called', () => {
  const step = state('a');
  const calls = [];
  const onConfirm = () => calls.push('confirm');
  const box = div({ props: { onConfirm, dataset: { onboarding: step } }, attrs: { online: step } });
  document.body.append(box);

  step.set('b');

  assert.equal(box.onConfirm, onConfirm);
  assert.deepEqual(calls, []);
  assert.equal(box.dataset.onboarding, 'b');
  assert.equal(box.getAttribute('online'), 'b');
  box.remove();
});

test('an object that is not a signal is assigned whole', () => {
  const stream = new (class MediaStreamLike {})();
  const el = div({ props: { stream } });

  assert.equal(el.stream, stream);
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

test('each keeps its rows when a render fails partway through', async () => {
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

  const errors = await reported(() => items.set([1, 2, 99]));
  assert.match(String(errors[0]), /bad row/);
  items.set([1, 2]);
  reads = 0;
  label.set('b');

  assert.equal(renders, 3);
  assert.equal(reads, 2);
});

test('a function in an on* attribute or prop is never called as a binding, in any case', () => {
  let calls = 0;
  button({ attrs: { OnClick: () => calls++ }, props: { ONCLICK: () => calls++ } });

  assert.equal(calls, 0);
});

test('a live child built elsewhere pauses when the place it moved to is removed', async () => {
  const count = state(1);
  let reads = 0;
  const holder = div({ children: ['Count: ', () => (reads++, count.get())] });
  const section = div();
  section.append(...holder.childNodes);
  document.body.append(section);
  await tick();

  section.remove();
  await tick();
  count.set(2);

  assert.equal(reads, 1);
});

test('readers that catch the error of a computed recover; a binding that does not is stopped', async () => {
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

  const errors = await reported(() => text.set('{bad'));
  text.set('{"a":9}');

  assert.deepEqual(seen, [1, 'error', 9]);
  assert.equal(label.textContent, '1');
  assert.equal(errors.length, 1);
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

test('an effect that stops itself and then throws leaves nothing running', async () => {
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

  const errors = await reported(() => count.set(1));
  count.set(2);
  count.set(3);

  assert.equal(inner, 1);
  assert.equal(errors.length, 1);
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

test('a nested list built top-down is walked once', async () => {
  const host = document.createElement('ul');
  host.append(div({ children: state('live') }));
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
      const item = document.createElement('li');
      const list = document.createElement('ul');
      item.append(list);
      parent.append(item);
      parent = list;
    }
    await tick();
  } finally {
    document.createTreeWalker = createTreeWalker;
    host.remove();
  }

  assert.ok(steps < 1800, `walked ${steps} nodes for 600`);
});

test('a loop error and the errors of other effects are all reported', async () => {
  const count = state(0);
  effect(() => {
    if (count.get() > 0) throw new Error('first failed');
  });
  effect(() => {
    if (count.get() > 0) count.set(count.get() + 1);
  });

  const errors = await reported(() => count.set(1));

  assert.equal(errors.length, 2);
  assert.ok(errors.some((error) => /first failed/.test(String(error))));
  assert.ok(errors.some((error) => /ran more than 100 times/.test(String(error))));
});

test('fault injection: a callback that throws during updates is reported once and the rest keeps working', async () => {
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
    const healthy = [];
    effect(() => healthy.push(source.get()));
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
    const errors = await reported(() => source.set(1));
    armed = false;
    source.set(10);

    // The computed is read by the effect and the binding, and each reader reports its own failure.
    assert.equal(errors.length, point === 'computed' ? 2 : 1, `${point}: reported once per reader`);
    assert.ok(errors.every((error) => String(error).includes(`injected ${point}`)), `${point}: the injected error`);
    assert.deepEqual(healthy, [0, 1, 10], `${point}: an unrelated effect`);
    // A failure stops only the effect it happened in; cleanups and row cleanups stop nothing.
    const stops = { computed: ['effect', 'binding'], effect: ['effect'], binding: ['binding'], render: ['list'] }[point] ?? [];
    assert.equal(log.at(-1), stops.includes('effect') ? 0 : 20, `${point}: effect`);
    assert.equal(label.textContent, stops.includes('binding') ? '0' : '20', `${point}: binding`);
    assert.equal(list.textContent, stops.includes('list') ? '01' : '1011', `${point}: list`);
    label.remove();
    list.remove();
  }
});

test('fault injection: a callback that throws while things are created is reported once and leaks nothing', async () => {
  const points = ['first-run', 'write-reader', 'cleanup', 'owned', 'binding'];
  for (const point of points) {
    const runs = {};
    const step = (name) => {
      runs[name] = (runs[name] ?? 0) + 1;
      if (name === point) throw new Error(`injected ${name}`);
    };
    const source = state(0);
    const flag = state(false);
    const healthy = [];
    let label;

    const errors = await reported(() => {
      effect(() => healthy.push(source.get()));
      effect(() => {
        source.get();
        step('first-run');
      });
      effect(() => {
        source.get();
        if (flag.get()) step('write-reader');
      });
      effect(() => flag.set(true));
      effect(() => () => step('cleanup'))();
      effect(() => {
        effect(() => {
          source.get();
          step('owned');
        });
      });
      label = div({ children: () => (step('binding'), String(source.get())) });
    });
    const failedRuns = runs[point];
    source.set(1);
    source.set(2);

    assert.equal(errors.length, 1, `${point}: reported once`);
    assert.match(String(errors[0]), new RegExp(`injected ${point}`), `${point}: the injected error`);
    assert.deepEqual(healthy, [0, 1, 2], `${point}: an unrelated effect`);
    assert.equal(runs[point], failedRuns, `${point}: the failed callback does not run again`);
    assert.equal(label.tagName, 'DIV', `${point}: the element is built`);
    if (point !== 'binding') assert.equal(label.textContent, '2', `${point}: binding`);
  }
});

test('effect() returns its stop function even when the effects it starts fail', async () => {
  const s = state(0);
  effect(() => {
    if (s.get() === 1) throw new Error('reader failed');
  });
  const own = state(0);
  let runs = 0;
  let stop;
  const errors = await reported(() => {
    stop = effect(() => {
      runs++;
      own.get();
      s.set(1);
    });
  });
  stop();
  own.set(1);

  assert.equal(errors.length, 1);
  assert.equal(runs, 1);
});

test('a first run that writes and then throws still updates the readers of what it wrote', async () => {
  const s = state(0);
  const seen = [];
  effect(() => seen.push(s.get()));

  const errors = await reported(() =>
    effect(() => {
      s.set(1);
      throw new Error('after write');
    }),
  );

  assert.deepEqual(seen, [0, 1]);
  assert.equal(errors.length, 1);
});


test('a computed that failed before reading another computed recovers', () => {
  const x = state(0);
  const inner = computed(() => x.get() + 1);
  let fail = false;
  const outer = computed(() => {
    if (fail) throw new Error('outer');
    return inner.get() * 10;
  });
  const seen = [];
  effect(() => {
    try {
      seen.push(outer.get());
    } catch {
      seen.push('error');
    }
  });

  fail = true;
  x.set(1);
  fail = false;
  x.set(2);

  assert.deepEqual(seen, [10, 'error', 30]);
});

test('a cleanup error is reported when the run itself throws', async () => {
  const count = state(0);
  effect(() => {
    if (count.get() === 1) throw new Error('run failed');
    return () => {
      throw new Error('cleanup failed');
    };
  });

  const errors = await reported(() => count.set(1));

  assert.equal(errors.length, 2);
  assert.ok(errors.some((error) => /run failed/.test(String(error))));
  assert.ok(errors.some((error) => /cleanup failed/.test(String(error))));
});

test('a failing stop does not hide the error of the first run', async () => {
  const errors = await reported(() =>
    effect(() => {
      effect(() => () => {
        throw new Error('inner cleanup');
      });
      throw new Error('outer');
    }),
  );

  assert.equal(errors.length, 2);
  assert.ok(errors.some((error) => /outer/.test(String(error))));
  assert.ok(errors.some((error) => /inner cleanup/.test(String(error))));
});

test('mutate notifies even when its function throws', () => {
  const list = state([]);
  const lengths = [];
  effect(() => lengths.push(list.get().length));

  assert.throws(() =>
    list.mutate((items) => {
      items.push(1);
      throw new Error('mutate failed');
    }),
  );

  assert.deepEqual(lengths, [0, 1]);
});

test('mutate throws the error of its own function when an effect also fails', async () => {
  const list = state([]);
  effect(() => {
    if (list.get().length === 1) throw new Error('effect boom');
  });

  const errors = await reported(() =>
    assert.throws(
      () =>
        list.mutate((items) => {
          items.push(1);
          throw new Error('fn boom');
        }),
      /fn boom/,
    ),
  );

  assert.match(String(errors[0]), /effect boom/);
});

test('an effect that writes what it read during its first run keeps every cleanup', () => {
  const count = state(0);
  const log = [];
  effect(() => {
    const value = count.get();
    log.push(`run${value}`);
    if (value < 1) count.set(value + 1);
    return () => log.push(`cleanup${value}`);
  });
  count.set(5);

  assert.deepEqual(log, ['run0', 'cleanup0', 'run1', 'cleanup1', 'run5']);
});

test('an update through many diamond-shaped dependencies stays linear', () => {
  const source = state(0);
  let top = source;
  let runs = 0;
  for (let i = 0; i < 25; i++) {
    const below = top;
    const left = computed(() => (runs++, below.get() + 1));
    const right = computed(() => (runs++, below.get() + 1));
    top = computed(() => (runs++, left.get() + right.get()));
  }
  const values = [];
  effect(() => values.push(top.get()));
  runs = 0;
  const started = performance.now();

  source.set(1);

  assert.equal(runs, 75);
  assert.ok(performance.now() - started < 100);
  assert.equal(values.length, 2);
});

test('many writes in one update do not walk the readers of a computed again each time', () => {
  const measure = (readers) => {
    const source = state(0);
    const shared = computed(() => source.get());
    for (let i = 0; i < readers; i++) effect(() => shared.get());
    const go = state(false);
    effect(() => {
      if (go.get()) for (let i = 1; i <= 10_000; i++) source.set(i);
    });
    const started = performance.now();
    go.set(true);
    return performance.now() - started;
  };
  measure(1000);
  const few = measure(10);
  const many = measure(1000);

  assert.ok(many < few * 5 + 10, `1,000 readers took ${many.toFixed(1)} ms, 10 readers ${few.toFixed(1)} ms`);
});

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

/** A fetcher whose calls are recorded and settled by the test. */
function manual() {
  const calls = [];
  const fetcher = (value, { signal }) => {
    const call = { value, signal, ...deferred() };
    calls.push(call);
    return call.promise;
  };
  return { calls, fetcher };
}

test('resource loads when its source changes and ignores older responses', async () => {
  const id = state(1);
  const { calls, fetcher } = manual();
  const user = resource(id, fetcher);

  assert.equal(user.loading.get(), true);
  id.set(2);
  assert.equal(calls[0].signal.aborted, true);
  calls[1].resolve('two');
  await tick();
  calls[0].resolve('one');
  await tick();

  assert.deepEqual(calls.map((call) => call.value), [1, 2]);
  assert.equal(user.get(), 'two');
  assert.equal(user.loading.get(), false);
});

test('resource does not load while its source is null, undefined or false', async () => {
  const id = state(null);
  const { calls, fetcher } = manual();
  const user = resource(() => id.get(), fetcher);

  assert.equal(calls.length, 0);
  assert.equal(user.loading.get(), false);
  id.set(false);
  id.set(undefined);
  id.set(3);

  assert.deepEqual(calls.map((call) => call.value), [3]);
});

test('resource keeps the error of a failed load until the next load starts', async () => {
  const { calls, fetcher } = manual();
  const data = resource(fetcher);
  calls[0].reject(new Error('offline'));
  await tick();

  assert.match(String(data.error.get()), /offline/);
  assert.equal(data.loading.get(), false);
  data.refetch();
  assert.equal(data.error.get(), undefined);
  assert.equal(data.loading.get(), true);
  calls[1].resolve('ok');
  await tick();

  assert.equal(data.get(), 'ok');
  assert.equal(calls[1].value, true);
});

test('resource turns a synchronous throw of its fetcher into the error', async () => {
  const data = resource(() => {
    throw new Error('sync');
  });
  await tick();

  assert.match(String(data.error.get()), /sync/);
  assert.equal(data.loading.get(), false);
});

test('resource keeps its value while reloading, and mutate sets it without loading', async () => {
  const { calls, fetcher } = manual();
  const data = resource(fetcher);
  calls[0].resolve('first');
  await tick();
  data.refetch();

  assert.equal(data.get(), 'first');
  data.mutate('local');
  assert.equal(data.get(), 'local');
  assert.equal(calls.length, 2);
});

test('resource runs its fetcher untracked and aborts when its owner stops', async () => {
  const other = state(0);
  const { calls, fetcher } = manual();
  let data;
  const stop = effect(() => {
    data = resource((value, info) => (other.get(), fetcher(value, info)));
  });
  other.set(1);
  stop();
  calls[0].resolve('late');
  await tick();

  assert.equal(calls.length, 1);
  assert.equal(calls[0].signal.aborted, true);
  assert.equal(data.get(), undefined);
});

test('a resource binds as a child', async () => {
  const { calls, fetcher } = manual();
  const data = resource(fetcher);
  const label = span({ children: data });
  const status = span({ children: () => (data.loading.get() ? 'loading' : 'done') });
  assert.equal(status.textContent, 'loading');

  calls[0].resolve('Ada');
  await tick();

  assert.equal(label.textContent, 'Ada');
  assert.equal(status.textContent, 'done');
});

test('classList keeps strings on and toggles object keys by booleans, signals and getters', () => {
  const active = state(false);
  const enabled = state(true);
  const card = div({
    props: { className: classList(['card', { active, disabled: () => !enabled.get(), shadow: true, hidden: false }]) },
  });
  const shape = div({ attrs: { class: classList({ hot: active }) } });

  assert.equal(card.className, 'card shadow');
  active.set(true);
  enabled.set(false);
  assert.equal(card.className, 'card active disabled shadow');
  assert.equal(shape.getAttribute('class'), 'hot');
});

test('signals bind through builder props and attrs, nested props and plain-call children', () => {
  const done = state(false);
  const color = state('red');
  const label = state('Ada');
  const box = input.props({ type: 'checkbox', checked: done, style: { color } }).attrs({ title: label }).create();
  const text = span(label);

  done.set(true);
  color.set('blue');
  label.set('Grace');

  assert.equal(box.checked, true);
  assert.equal(box.style.color, 'blue');
  assert.equal(box.getAttribute('title'), 'Grace');
  assert.equal(text.textContent, 'Grace');
});
