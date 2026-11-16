import { computed, each, state, type State } from '@fiorejs/signals';

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

function TodoItem(props: { todo: Todo }) {
  const { todo } = props;
  return (
    <li class={computed(() => (todo.done.get() ? 'item done' : 'item'))}>
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
  const field = (<input name="todo" placeholder="What needs doing?" autocomplete="off" required />) as HTMLInputElement;

  return (
    <main class="app">
      <header>
        <h1>
          Fiore <small>+ signals</small>
        </h1>
        <span class="count">{computed(() => `${left.get()} left`)}</span>
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
        {each(
          todos,
          (todo) => (
            <TodoItem todo={todo} />
          ),
          (todo) => todo.id,
        )}
      </ul>
      <p class="hint">Only the parts that read a signal update when it changes; there is no virtual DOM.</p>
    </main>
  );
}

document.body.append(<App />);
['Edit src/main.tsx', 'Add a component', 'Build something'].forEach(add);
