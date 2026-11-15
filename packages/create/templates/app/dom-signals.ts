import { button, form, h1, header, input, label, li, main, p, small, span, ul } from 'fiorejs';
import { classList, computed, each, state, type State } from '@fiorejs/signals';

type Todo = { id: number; text: string; done: State<boolean> };

let nextId = 1;
const todos = state<Todo[]>([]);
const left = computed(() => todos.get().filter((todo) => !todo.done.get()).length);

function add(text: string) {
  todos.update((list) => [...list, { id: nextId++, text, done: state(false) }]);
}

function remove(todo: Todo) {
  todos.update((list) => list.filter((item) => item !== todo));
}

function TodoItem(todo: Todo) {
  return li.props({ className: classList(['item', { done: todo.done }]) }).of([
    label.of([
      input
        .props({ type: 'checkbox', checked: todo.done })
        .on({ change: (event) => todo.done.set(event.currentTarget.checked) })
        .of(),
      span(todo.text),
    ]),
    button
      .props({ className: 'ghost' })
      .attrs({ 'aria-label': `Remove ${todo.text}` })
      .on({ click: () => remove(todo) })
      .of('✕'),
  ]);
}

const field = input
  .props({ name: 'todo', placeholder: 'What needs doing?', required: true })
  .attrs({ autocomplete: 'off' })
  .of();

document.body.append(
  main.props({ className: 'app' }).of([
    header.of([
      h1.of(['Fiore ', small('+ signals')]),
      span.props({ className: 'count' }).of(() => `${left.get()} left`),
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
      .of([field, button.props({ type: 'submit' }).of('Add')]),
    ul.props({ className: 'list' }).of(each(todos, TodoItem, (todo) => todo.id)),
    p
      .props({ className: 'hint' })
      .of('Only the parts that read a signal update when it changes; there is no virtual DOM.'),
  ]),
);

['Edit src/main.ts', 'Add a component', 'Build something'].forEach(add);
