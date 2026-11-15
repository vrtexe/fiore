import { button, form, h1, header, input, label, li, main, p, small, span, ul } from 'fiorejs';

const count = span({ props: { className: 'count' } });
const list = ul({ props: { className: 'list' } });
const field = input({
  props: { name: 'todo', placeholder: 'What needs doing?', required: true },
  attributes: { autocomplete: 'off' },
});

function updateCount() {
  count.textContent = `${list.children.length} items`;
}

function TodoItem(text: string) {
  const item: HTMLLIElement = li({
    props: { className: 'item' },
    children: [
      label({
        children: [
          input({
            props: { type: 'checkbox' },
            event: { change: (event) => item.classList.toggle('done', event.currentTarget.checked) },
          }),
          span({ children: text }),
        ],
      }),
      button({
        props: { className: 'ghost' },
        attributes: { 'aria-label': `Remove ${text}` },
        event: {
          click: () => {
            item.remove();
            updateCount();
          },
        },
        children: '✕',
      }),
    ],
  });
  return item;
}

function add(text: string) {
  list.append(TodoItem(text));
  updateCount();
}

document.body.append(
  main({
    props: { className: 'app' },
    children: [
      header({ children: [h1({ children: ['Fiore ', small({ children: '+ DOM' })] }), count] }),
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
      list,
      p({
        props: { className: 'hint' },
        children: 'No virtual DOM: every function returns a real element, and updates are plain DOM calls.',
      }),
    ],
  }),
);

['Edit src/main.ts', 'Add a component', 'Build something'].forEach(add);
