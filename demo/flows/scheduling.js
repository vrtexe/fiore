import { div, span, strong } from 'fiorejs';
import { effect, flush, root, state } from '@fiorejs/signals';
import { action, card, flow, logger } from '../debug.js';

export default function scheduling() {
  // 1. Writes are batched: the effect and the binding run once per flush, not once per write.
  const count = state(0);
  const batch = logger();
  effect(() => batch.write(`effect ran: count is ${count.get()}`));

  // 2. The DOM updates in the flush; flush() runs it right away.
  const word = state('one');
  const label = strong(word);
  const reads = logger();
  const read = (next, now) => {
    word.set(next);
    if (now) {
      flush();
    }
    reads.write(`set "${next}"${now ? ', flush()' : ''}: the DOM shows "${label.textContent}"`);
  };

  // 3. effect.pre runs before the bindings of a flush, effect.post after them.
  const size = state(1);
  const box = span(size.computed((n) => '■'.repeat(n)));
  const phases = logger();
  effect.pre(() => phases.write(`pre:  size ${size.get()}, the box shows ${box.textContent.length}`));
  effect.post(() => phases.write(`post: size ${size.get()}, the box shows ${box.textContent.length}`));

  // 4. A root owns what is created in it; its dispose function stops all of it.
  const ticks = state(0);
  setInterval(() => ticks.update((value) => value + 1), 1000);
  const slot = div('(no widget)');
  const roots = logger();
  /** @type {(() => void) | undefined} */
  let dispose;
  const create = () => {
    dispose?.();
    dispose = root(() => {
      effect(() => roots.write(`widget effect: tick ${ticks.get()}`));
      slot.replaceChildren(div(['widget: tick ', ticks]));
    });
  };

  return flow('scheduling', 'Scheduling', 'A write applies at once, but effects and bindings rerun together in one flush on a microtask. flush() runs it now; effect.pre and effect.post choose a phase; root() owns what it creates.', [
    card('Batching', div(['count: ', span(count)]), [action('Set three times', () => [1, 2, 3].forEach((n) => count.set(count.get() + n))), action('Set to 0', () => count.set(0))], batch),
    card('flush()', label, [action('Set "two"', () => read('two', false)), action('Set "three", then flush()', () => read('three', true)), action('Set "one"', () => read('one', false))], reads),
    card('effect.pre and effect.post', box, [action('size + 1', () => size.update((n) => n + 1)), action('size = 1', () => size.set(1))], phases),
    card('root()', slot, [action('Create a widget in a root', create), action('Dispose the root', () => {
      dispose?.();
      dispose = undefined;
      roots.write('disposed: the widget no longer updates');
    })], roots),
  ]);
}
