import { button, form, h1, header, input, label, li, main, p, small, span, ul } from 'fiorejs';

const count = span.props({ className: 'count' }).of();
const list = ul.props({ className: 'list' }).of();
const field = input
  .props({ name: 'todo', placeholder: 'What needs doing?', required: true })
  .attrs({ autocomplete: 'off' })
  .of();

function updateCount() {
  count.textContent = `${list.children.length} items`;
}

function TodoItem(text: string) {
  const item: HTMLLIElement = li.props({ className: 'item' }).of([
    label.of([
      input
        .props({ type: 'checkbox' })
        .on({ change: (event) => item.classList.toggle('done', event.currentTarget.checked) })
        .of(),
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
      .of('✕'),
  ]);
  return item;
}

function add(text: string) {
  list.append(TodoItem(text));
  updateCount();
}

document.body.append(
  main.props({ className: 'app' }).of([
    header.of([h1.of(['Fiore ', small('+ DOM')]), count]),
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
    list,
    p
      .props({ className: 'hint' })
      .of('No virtual DOM: every function returns a real element, and updates are plain DOM calls.'),
  ]),
);

['Edit src/main.ts', 'Add a component', 'Build something'].forEach(add);
