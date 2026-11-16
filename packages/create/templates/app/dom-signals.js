import { button, form, h1, header, input, label, li, main, p, small, span, ul } from 'fiorejs';
import { classList, computed, state } from '@fiorejs/signals';

let nextId = 1;
const todos = state([]);
const left = computed(() => todos.get().filter((todo) => !todo.done.get()).length);

function add(text) {
  todos.update((list) => [...list, { id: nextId++, text, done: state(false) }]);
}

function remove(todo) {
  todos.update((list) => list.filter((item) => item !== todo));
}

function TodoItem(todo) {
  return li.props({ className: classList(['item', { done: todo.done }]) }).create([
    label.create([
      input
        .props({ type: 'checkbox', checked: todo.done })
        .on({ change: (event) => todo.done.set(event.currentTarget.checked) })
        .create(),
      span.create(todo.text),
    ]),
    button
      .props({ className: 'ghost' })
      .attrs({ 'aria-label': `Remove ${todo.text}` })
      .on({ click: () => remove(todo) })
      .create('✕'),
  ]);
}

const field = input
  .props({ name: 'todo', placeholder: 'What needs doing?', required: true })
  .attrs({ autocomplete: 'off' })
  .create();

document.body.append(
  main.props({ className: 'app' }).create([
    header.create([
      h1.create(['Fiore ', small('+ signals')]),
      span.props({ className: 'count' }).create(left.computed((count) => `${count} left`)),
    ]),
    form
      .props({ className: 'add' })
      .on({
        submit: (event) => {
          event.preventDefault();
          add(field.value.trim());
          field.value = '';
          field.focus();
        },
      })
      .create([field, button.props({ type: 'submit' }).create('Add')]),
    ul.props({ className: 'list' }).create(todos.for((todo) => todo.id).map(TodoItem)),
    p
      .props({ className: 'hint' })
      .create('Only the parts that read a signal update when it changes; there is no virtual DOM.'),
  ]),
);

['Edit src/main.js', 'Add a component', 'Build something'].forEach(add);
