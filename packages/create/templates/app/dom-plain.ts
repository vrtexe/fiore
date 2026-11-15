import { button, form, h1, header, input, label, li, main, p, small, span, ul } from 'fiorejs';

const count = span.props({ className: 'count' }).create();
const list = ul.props({ className: 'list' }).create();
const field = input
  .props({ name: 'todo', placeholder: 'What needs doing?', required: true })
  .attrs({ autocomplete: 'off' })
  .create();

function updateCount() {
  count.textContent = `${list.children.length} items`;
}

function TodoItem(text: string) {
  const item: HTMLLIElement = li.props({ className: 'item' }).create([
    label.create([
      input
        .props({ type: 'checkbox' })
        .on({ change: (event) => item.classList.toggle('done', event.currentTarget.checked) })
        .create(),
      span(text),
    ]),
    button
      .props({ className: 'ghost' })
      .attrs({ 'aria-label': `Remove ${text}` })
      .on({
        click: () => {
          item.remove();
          updateCount();
        },
      })
      .create('✕'),
  ]);
  return item;
}

function add(text: string) {
  list.append(TodoItem(text));
  updateCount();
}

document.body.append(
  main.props({ className: 'app' }).create([
    header.create([h1.create(['Fiore ', small('+ DOM')]), count]),
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
    list,
    p
      .props({ className: 'hint' })
      .create('No virtual DOM: every function returns a real element, and updates are plain DOM calls.'),
  ]),
);

['Edit src/main.ts', 'Add a component', 'Build something'].forEach(add);
