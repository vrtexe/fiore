import { button, div, span, strong } from 'fiorejs';
import { resource, state } from '@fiorejs/signals';
import { action, card, flow, logger } from '../debug.js';

/** A fake server: answers after a delay, fails for id 4, and honours the abort signal. */
function fetchUser(id, { signal }) {
  return new Promise((resolve, reject) => {
    const delay = 400 + Math.random() * 800;
    const timer = setTimeout(() => (id === 4 ? reject(new Error('user 4 does not exist')) : resolve({ id, name: `User ${id}` })), delay);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new Error('aborted'));
    });
  });
}

export default function resources() {
  const id = state(1);
  const events = logger();
  const user = resource(id, (value, info) => {
    events.write(`load user ${value}`);
    info.signal.addEventListener('abort', () => events.write(`aborted the load of user ${value}`));
    return fetchUser(value, info);
  });
  const view = div([
    strong(user.computed((value) => (value ? value.name : '—'))),
    ' ',
    span(user.loading.computed((loading) => (loading ? '(loading…)' : ''))),
    ' ',
    span.attrs({ class: 'error' }).create(user.error.computed((error) => (error ? String(error.message) : ''))),
  ]);

  return flow('resource', 'Async: resource', 'resource(source, fetcher) loads again when its source changes, aborts the older load, keeps the last value while loading, and exposes loading and error signals. User 4 fails on purpose.', [
    card(
      'Load a user',
      view,
      [
        action('Previous', () => id.update((value) => Math.max(1, value - 1))),
        action('Next', () => id.update((value) => value + 1)),
        action('Next three quickly', () => {
          id.update((value) => value + 1);
          id.update((value) => value + 1);
          id.update((value) => value + 1);
        }),
        action('Refetch', () => user.refetch()),
        action('Rename locally (mutate)', () => user.mutate({ id: id.get(), name: 'Renamed without loading' })),
        button.on({ click: () => events.clear() }).create('Clear log'),
      ],
      events,
    ),
  ]);
}
