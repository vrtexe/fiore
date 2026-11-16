import { div, span, strong } from 'fiorejs';
import { computed, effect, state } from '@fiorejs/signals';
import { action, card, flow, logger } from '../debug.js';

export default function lifecycle() {
  // 1. A binding pauses while its element is out of the document and resumes with the current value.
  const ticks = state(0);
  setInterval(() => ticks.update((value) => value + 1), 1000);
  let applied = 0;
  const watched = span(computed(() => (applied++, `tick ${ticks.get()}`)));
  const slot = div(watched);
  const pauses = logger();
  const status = () => `in document: ${watched.isConnected}, the binding has run ${applied} times`;

  // 2. A computed that builds elements owns what it creates: hiding it stops the inner bindings and effects.
  const show = state(true);
  const owned = logger();
  const panel = div(
    show.computed((visible) => {
      if (!visible) return 'hidden';
      effect(() => {
        owned.write(`inner effect sees tick ${ticks.get()}`);
        return () => owned.write('inner effect cleanup (before each rerun, and when the computed stops it)');
      });
      return strong('visible: an inner effect is running');
    }),
  );

  return flow('lifecycle', 'Lifecycle', 'Bindings follow the document: removing an element pauses its bindings, inserting it again resumes them. A computed child owns the effects it creates and stops them when it changes.', [
    card(
      'Pause and resume',
      slot,
      [
        action('Remove from the page', () => {
          watched.remove();
          setTimeout(() => pauses.write(`removed: ${status()}`));
        }),
        action('Insert again', () => {
          slot.append(watched);
          setTimeout(() => pauses.write(`inserted: ${status()}`));
        }),
        action('Status', () => pauses.write(status())),
      ],
      pauses,
    ),
    card('Ownership of a computed child', panel, [action('Toggle', () => show.update((value) => !value)), action('Clear log', () => owned.clear())], owned),
  ]);
}
