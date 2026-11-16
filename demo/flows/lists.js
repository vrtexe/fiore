import { button, input, label, li, span, ul } from 'fiorejs';
import { classList, state } from '@fiorejs/signals';
import { action, card, flow, logger } from '../debug.js';

let nextId = 1;
const todo = (text) => ({ id: nextId++, text, done: state(false) });

export default function lists() {
  // 1. map: rows are kept for the same item objects; a reorder moves only the rows out of place.
  const todos = state([todo('milk'), todo('eggs'), todo('bread')]);
  const renders = logger();
  const row = (item) => {
    renders.write(`render row "${item.text}"`);
    return li.props({ className: classList({ done: item.done }) }).create([
      label([input.attrs({ type: 'checkbox' }).props({ checked: item.done }).on({ change: (event) => item.done.set(event.currentTarget.checked) }).create(), ' ', item.text]),
      ' ',
      input.attrs({ placeholder: 'focus me, then reorder' }).create(),
      button.on({ click: () => todos.update((list) => list.filter((other) => other !== item)) }).create('✕'),
    ]);
  };
  const list = ul(todos.map(row));
  const left = todos.computed((items) => items.filter((item) => !item.done.get()).length);

  // 2. for(key): keyed by id. A copy with the same id reuses the row as it is, so changing fields belong in signals.
  const plain = state([
    { id: 1, text: 'first' },
    { id: 2, text: 'second' },
  ]);
  const keyed = ul(plain.for((item) => item.id).map((item) => li(item.text)));
  const notes = logger();

  return flow('lists', 'Lists', 'signal.map(render) keeps the rows of items it has seen; signal.for(key).map(render) keys them by a field. Watch which rows render, and focus an input before reordering: the row is moved, not rebuilt.', [
    card(
      'map: a todo list',
      [list, span(['left: ', span(left)])],
      [
        action('Add', () => todos.update((list) => [...list, todo(`item ${nextId}`)])),
        action('Reverse', () => todos.update((list) => list.toReversed())),
        action('Shuffle', () => todos.update((list) => list.toSorted(() => Math.random() - 0.5))),
        action('Clear done', () => todos.update((list) => list.filter((item) => !item.done.get()))),
      ],
      renders,
    ),
    card(
      'for(key): copies with the same key',
      keyed,
      [
        action('Replace with an edited copy', () => {
          plain.set(plain.get().map((item) => ({ ...item, text: `${item.text}!` })));
          notes.write(`data now: ${plain.get().map((item) => item.text).join(', ')} (rows show what they were created with)`);
        }),
        action('Add id 3', () => plain.update((list) => [...list, { id: 3, text: 'third' }])),
        action('Reverse', () => plain.update((list) => list.toReversed())),
      ],
      notes,
    ),
  ]);
}
