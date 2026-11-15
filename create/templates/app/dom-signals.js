import { button, form, h1, header, input, label, li, main, p, small, span, ul } from 'fiorejs';
import { computed, each, state } from '@fiorejs/signals';

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
  return li({
    attributes: { class: () => (todo.done.get() ? 'item done' : 'item') },
    children: [
      label({
        children: [
          input({
            props: { type: 'checkbox', checked: todo.done },
            event: { change: (event) => todo.done.set(event.currentTarget.checked) },
          }),
          span({ children: todo.text }),
        ],
      }),
      button({
        props: { className: 'ghost' },
        attributes: { 'aria-label': `Remove ${todo.text}` },
        event: { click: () => remove(todo) },
        children: '✕',
      }),
    ],
  });
}

const field = input({
  props: { name: 'todo', placeholder: 'What needs doing?', required: true },
  attributes: { autocomplete: 'off' },
});

document.body.append(
  main({
    props: { className: 'app' },
    children: [
      header({
        children: [
          h1({ children: ['Fiore ', small({ children: '+ signals' })] }),
          span({ props: { className: 'count' }, children: () => `${left.get()} left` }),
        ],
      }),
      form({
        props: { className: 'add' },
        event: {
          submit: (event) => {
            event.preventDefault();
            add(field.value.trim());
            field.value = '';
            field.focus();
          },
        },
        children: [field, button({ props: { type: 'submit' }, children: 'Add' })],
      }),
      ul({ props: { className: 'list' }, children: each(todos, TodoItem, (todo) => todo.id) }),
      p({
        props: { className: 'hint' },
        children: 'Only the parts that read a signal update when it changes; there is no virtual DOM.',
      }),
    ],
  }),
);

['Edit src/main.js', 'Add a component', 'Build something'].forEach(add);
