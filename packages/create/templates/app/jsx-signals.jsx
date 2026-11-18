import { computed, state } from '@fiorejs/signals';

let nextId = 1;
const todos = state([]);
const left = computed(() => todos.get().filter((todo) => !todo.done.get()).length);

function add(text) {
  todos.update((list) => [...list, { id: nextId++, text, done: state(false) }]);
}

function remove(todo) {
  todos.update((list) => list.filter((item) => item !== todo));
}

function TodoItem(props) {
  const { todo } = props;
  return (
    <li class={todo.done.computed((done) => (done ? 'item done' : 'item'))}>
      <label>
        <input type="checkbox" checked={todo.done} onchange={(event) => todo.done.set(event.currentTarget.checked)} />
        <span>{todo.text}</span>
      </label>
      <button class="ghost" aria-label={`Remove ${todo.text}`} onclick={() => remove(todo)}>
        ✕
      </button>
    </li>
  );
}

function App() {
  const field = <input name="todo" placeholder="What needs doing?" autocomplete="off" required />;

  return (
    <main class="app">
      <header>
        <h1>
          Fiore <small>+ signals</small>
        </h1>
        <span class="count">{left.computed((count) => `${count} left`)}</span>
      </header>
      <form
        class="add"
        onsubmit={(event) => {
          event.preventDefault();
          add(field.value.trim());
          field.value = '';
          field.focus();
        }}
      >
        {field}
        <button type="submit">Add</button>
      </form>
      <ul class="list">
        {todos.map((todo) => (
          <TodoItem todo={todo} />
        ))}
      </ul>
      <p class="hint">Only the parts that read a signal update when it changes; there is no virtual DOM.</p>
    </main>
  );
}

document.body.append(<App />);
['Edit src/main.jsx', 'Add a component', 'Build something'].forEach(add);
