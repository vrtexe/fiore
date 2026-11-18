// Microbenchmark of the reactive engine, without a DOM.
// Run from packages/signals: node --expose-gc --max-semi-space-size=256 bench/bench.js
// The large semi-space keeps young-generation collections out of a run, so the heap growth of a run is what it allocated.
import { computed, effect, flush, selector, state } from '@fiorejs/signals';

const gc = /** @type {() => void} */ (globalThis.gc);
if (!gc) {
  throw new Error('Run with --expose-gc');
}

const ROUNDS = Number(process.env.ROUNDS ?? 7);

/**
 * @typedef {{ name: string, ops: number, unit: string, setup?: () => unknown, run: (context: any) => void, teardown?: (context: any) => void }} Case
 */

/** @type {Case[]} */
const cases = [
  {
    name: 'create and stop 100,000 effects',
    ops: 100_000,
    unit: 'effects',
    setup: () => state(0),
    run: (source) => {
      const stops = new Array(100_000);
      for (let i = 0; i < 100_000; i++) {
        stops[i] = effect(() => {
          source.get();
        });
      }
      for (let i = 0; i < 100_000; i++) {
        stops[i]();
      }
    },
  },
  {
    name: '10,000 effects on 10,000 states, update all',
    ops: 10_000,
    unit: 'updates',
    setup: () => {
      const states = Array.from({ length: 10_000 }, () => state(0));
      const stops = states.map((s) =>
        effect(() => {
          s.get();
        }),
      );
      return { states, stops, n: 0 };
    },
    run: (context) => {
      const n = ++context.n;
      for (const s of context.states) {
        s.set(n);
      }
      flush();
    },
    teardown: (context) => context.stops.forEach((stop) => stop()),
  },
  {
    name: 'diamond of computeds, 10,000 updates',
    ops: 10_000,
    unit: 'updates',
    setup: () => {
      const source = state(0);
      const left = computed(() => source.get() + 1);
      const right = computed(() => source.get() * 2);
      const sum = computed(() => left.get() + right.get());
      const stop = effect(() => {
        sum.get();
      });
      return { source, stop };
    },
    run: ({ source }) => {
      for (let i = 0; i < 10_000; i++) {
        source.set(source.get() + 1);
        flush();
      }
    },
    teardown: (context) => context.stop(),
  },
  {
    name: 'chain of 1,000 computeds, 10,000 updates',
    ops: 10_000,
    unit: 'updates',
    setup: () => {
      const source = state(0);
      /** @type {{ get(): number }} */
      let last = source;
      for (let i = 0; i < 1_000; i++) {
        const previous = last;
        last = computed(() => previous.get() + 1);
      }
      const end = last;
      const stop = effect(() => {
        end.get();
      });
      return { source, stop };
    },
    run: ({ source }) => {
      for (let i = 0; i < 10_000; i++) {
        source.set(source.get() + 1);
        flush();
      }
    },
    teardown: (context) => context.stop(),
  },
  {
    name: 'effect reading 1,000 states, 1,000 reruns',
    ops: 1_000,
    unit: 'reruns',
    setup: () => {
      const states = Array.from({ length: 1_000 }, () => state(0));
      const stop = effect(() => {
        for (const s of states) {
          s.get();
        }
      });
      return { states, stop };
    },
    run: ({ states }) => {
      for (let i = 0; i < 1_000; i++) {
        const s = states[i];
        s.set(s.get() + 1);
        flush();
      }
    },
    teardown: (context) => context.stop(),
  },
  {
    name: 'select over 10,000 keys, a computed per key, 1,000 selections',
    ops: 1_000,
    unit: 'selections',
    setup: () => {
      const selected = state(0);
      const stops = Array.from({ length: 10_000 }, (_, key) => {
        const on = selected.computed((id) => id === key);
        return effect(() => {
          on.get();
        });
      });
      return { selected, stops };
    },
    run: ({ selected }) => {
      for (let i = 1; i <= 1_000; i++) {
        selected.set(i);
        flush();
      }
    },
    teardown: (context) => context.stops.forEach((stop) => stop()),
  },
  {
    name: 'select over 10,000 keys with selector, 1,000 selections',
    ops: 1_000,
    unit: 'selections',
    setup: () => {
      const selected = state(0);
      const isSelected = selector(selected);
      const stops = Array.from({ length: 10_000 }, (_, key) =>
        effect(() => {
          isSelected(key).get();
        }),
      );
      return { selected, stops };
    },
    run: ({ selected }) => {
      for (let i = 1; i <= 1_000; i++) {
        selected.set(i);
        flush();
      }
    },
    teardown: (context) => context.stops.forEach((stop) => stop()),
  },
];

/** @param {number[]} values */
function median(values) {
  const sorted = values.toSorted((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/** Bytes as KB or MB. */
function size(/** @type {number} */ bytes) {
  return Math.abs(bytes) >= 1 << 20 ? `${(bytes / (1 << 20)).toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

console.log(`node ${process.version}, ${ROUNDS} rounds, median per case`);
console.log('case | ms | ops/s | allocated per run');
for (const c of cases) {
  const times = [];
  const allocations = [];
  for (let round = 0; round < ROUNDS; round++) {
    const context = c.setup?.();
    gc();
    const heap = process.memoryUsage().heapUsed;
    const started = performance.now();
    c.run(context);
    const elapsed = performance.now() - started;
    allocations.push(process.memoryUsage().heapUsed - heap);
    times.push(elapsed);
    c.teardown?.(context);
  }
  const ms = median(times);
  console.log(`${c.name} | ${ms.toFixed(1)} | ${Math.round((c.ops / ms) * 1000).toLocaleString('en')} ${c.unit}/s | ${size(median(allocations))}`);
}

// Retained memory of an effect with one source, after collection.
{
  const source = state(0);
  gc();
  const heap = process.memoryUsage().heapUsed;
  const stops = [];
  for (let i = 0; i < 100_000; i++) {
    stops.push(
      effect(() => {
        source.get();
      }),
    );
  }
  gc();
  const retained = (process.memoryUsage().heapUsed - heap) / 100_000;
  stops.forEach((stop) => stop());
  console.log(`retained per effect with one source: ${retained.toFixed(0)} bytes`);
}
