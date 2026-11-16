import { div, input, span, strong } from 'fiorejs';
import { classList, computed, effect, state, untrack } from '@fiorejs/signals';
import { action, card, flow, logger } from '../debug.js';

export default function signals() {
  // 1. state, computed, signal.computed and an effect, with run counts.
  const count = state(0);
  let doubleRuns = 0;
  const double = computed(() => (doubleRuns++, count.get() * 2));
  const label = count.computed((value) => (value === 1 ? '1 click' : `${value} clicks`));
  const runs = logger();
  effect(() => runs.write(`effect: count is ${count.get()}, double ran ${doubleRuns} times`));
  const counter = div([strong(label), ' · double: ', span(double)]);

  // 2. untrack reads without subscribing.
  const a = state(1);
  const b = state(10);
  const tracked = logger();
  effect(() => tracked.write(`effect ran: a=${a.get()}, b (untracked)=${untrack(() => b.get())}`));

  // 3. A computed may not set a signal: it throws and points to the alternatives.
  const rule = logger();
  const page = state(9);
  const last = state(4);
  const safePage = computed(() => Math.min(page.get(), last.get()));

  // 4. classList switches classes by condition; a value can be a boolean, a signal or a getter.
  const active = state(false);
  const done = state(false);
  const box = div.props({ className: classList(['card', { active, done: () => done.get() }]) }).create('Toggle my classes');

  // 5. Typing into a state updates everything that reads it.
  const name = state('Ada');
  const greeting = name.computed((value) => `Hello, ${value || 'stranger'}!`);
  const nameField = input.props({ value: name }).on({ input: (event) => name.set(event.currentTarget.value) }).create();

  return flow('signals', 'Signals', 'state holds a value, computed derives one lazily and caches it, effect runs again when what it read changes. Watch the logs to see what reruns.', [
    card('state, computed and effect', counter, [action('+1', () => count.update((value) => value + 1)), action('Set to 0', () => count.set(0))], runs),
    card('untrack', div(['a=', span(a), ' b=', span(b)]), [action('a + 1 (reruns)', () => a.update((value) => value + 1)), action('b + 1 (does not rerun)', () => b.update((value) => value + 1))], tracked),
    card(
      'A computed cannot set a signal',
      div(['page=', span(page), ' last=', span(last), ' safe page (derived)=', span(safePage)]),
      [
        action('Try a computed that clamps by writing', () => {
          try {
            computed(() => page.set(Math.min(page.get(), last.get()))).get();
          } catch (error) {
            rule.write(`threw: ${error.message}`);
          }
        }),
        action('page + 1', () => page.update((value) => value + 1)),
      ],
      rule,
    ),
    card('classList', box, [action('Toggle active', () => active.update((value) => !value)), action('Toggle done', () => done.update((value) => !value))]),
    card('Two-way input', div([nameField, ' ', strong(greeting)])),
  ]);
}
