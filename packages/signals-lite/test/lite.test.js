import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';

const { window } = new JSDOM();
Object.assign(globalThis, { document: window.document, Node: window.Node });

const { div, span, tbody, tr } = await import('fiorejs');
const { state, computed, effect, root, untrack, flush, selector, list } = await import('@fiorejs/signals-lite');

test('effects run once per flush, after the writes of the same task', async () => {
  const a = state(1);
  const b = state(2);
  const sum = computed(() => a.get() + b.get());
  const seen = [];
  effect(() => {
    seen.push(sum.get());
  });
  a.set(10);
  b.set(20);
  assert.deepEqual(seen, [3]);
  await Promise.resolve();
  assert.deepEqual(seen, [3, 30]);
});

test('a computed that keeps its value stops the update', () => {
  const n = state(1);
  const parity = computed(() => n.get() % 2);
  let runs = 0;
  effect(() => {
    parity.get();
    runs++;
  });
  n.set(3);
  flush();
  assert.equal(runs, 1);
  n.set(4);
  flush();
  assert.equal(runs, 2);
});

test('updates through a deep chain run without recursion limits', () => {
  // Each computed is read once as it is built; a first read of a never-read chain still nests through user code.
  const source = state(0);
  let last = source;
  for (let i = 0; i < 20000; i++) {
    const prev = last;
    last = computed(() => prev.get() + 1);
    last.get();
  }
  let value;
  effect(() => {
    value = last.get();
  });
  assert.equal(value, 20000);
  source.set(1);
  flush();
  assert.equal(value, 20001);
});

test('a write to a source during its own computed run is not lost', () => {
  const s = state(15);
  const clamped = computed(() => {
    const v = s.get();
    if (v > 10) s.set(10);
    return v;
  });
  const seen = [];
  effect(() => {
    seen.push(clamped.get());
  });
  flush();
  assert.equal(clamped.get(), 10);
  assert.equal(seen.at(-1), 10);
});

test('dependencies follow the last run, and a stopped effect stops reading', () => {
  const on = state(true);
  const a = state('a');
  const b = state('b');
  const seen = [];
  const stop = effect(() => {
    seen.push(on.get() ? a.get() : b.get());
  });
  on.set(false);
  flush();
  a.set('A');
  flush();
  assert.deepEqual(seen, ['a', 'b']);
  stop();
  b.set('B');
  flush();
  assert.deepEqual(seen, ['a', 'b']);
});

test('an effect stops the effects of its last run and calls its cleanup', () => {
  const outer = state(0);
  const inner = state(0);
  const log = [];
  const stop = root(() => {
    effect(() => {
      const o = outer.get();
      effect(() => {
        log.push(`inner ${o} ${inner.get()}`);
        return () => log.push(`cleanup ${o}`);
      });
    });
  });
  outer.set(1);
  flush();
  inner.set(1);
  flush();
  assert.deepEqual(log, ['inner 0 0', 'cleanup 0', 'inner 1 0', 'cleanup 1', 'inner 1 1']);
  stop();
  assert.equal(log.at(-1), 'cleanup 1');
  inner.set(2);
  flush();
  assert.equal(log.at(-1), 'cleanup 1');
});

test('untrack reads without subscribing', () => {
  const a = state(1);
  let runs = 0;
  effect(() => {
    untrack(() => a.get());
    runs++;
  });
  a.set(2);
  flush();
  assert.equal(runs, 1);
});

test('a binding writes the DOM only when its value changes', () => {
  const text = state('a');
  const upper = computed(() => text.get().toUpperCase());
  const el = span(upper);
  assert.equal(el.textContent, 'A');
  text.set('A');
  flush();
  assert.equal(el.textContent, 'A');
  text.set('b');
  flush();
  assert.equal(el.textContent, 'B');
});

test('selector writes only the old and the new key', () => {
  const selected = state(1);
  const danger = selector(selected, 'danger', '');
  const rows = [1, 2, 3].map((id) => div.props({ className: danger(id) }).create(String(id)));
  assert.deepEqual(rows.map((r) => r.className), ['danger', '', '']);
  selected.set(3);
  flush();
  assert.deepEqual(rows.map((r) => r.className), ['', '', 'danger']);
});

test('list keeps rows by key through reorder, removal, replacement and clear', () => {
  const items = state([{ id: 1 }, { id: 2 }, { id: 3 }]);
  let renders = 0;
  const body = tbody(
    list(
      items,
      (item) => {
        renders++;
        return tr(String(item.id));
      },
      (item) => item.id,
    ),
  );
  const ids = () => [...body.children].map((row) => row.textContent).join('');
  const first = body.firstElementChild;
  assert.equal(ids(), '123');

  items.set([{ id: 3 }, { id: 2 }, { id: 1 }]);
  flush();
  assert.equal(ids(), '321');
  assert.equal(body.lastElementChild, first);
  assert.equal(renders, 3);

  items.set([{ id: 3 }, { id: 1 }]);
  flush();
  assert.equal(ids(), '31');

  items.set([{ id: 4 }, { id: 5 }]);
  flush();
  assert.equal(ids(), '45');
  assert.equal(renders, 5);

  items.set([]);
  flush();
  assert.equal(body.childNodes.length, 0);
});

test('a removed row stops its bindings', () => {
  const label = state('x');
  const items = state([1]);
  let reads = 0;
  const shown = computed(() => {
    reads++;
    return label.get();
  });
  tbody(list(items, () => tr(shown)));
  items.set([]);
  flush();
  const before = reads;
  label.set('y');
  flush();
  assert.equal(reads, before);
});
