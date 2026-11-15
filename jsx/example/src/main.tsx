import './style.css';

const PLUS = 'M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z';
const TRASH = 'M9 3h6l1 2h4v2H4V5h4zM6 9h12l-1 12H7z';

function Icon(props: { path: string }) {
  return (
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={props.path} />
    </svg>
  );
}

function TodoItem(props: { text: string }) {
  const item: HTMLLIElement = (
    <li class="item">
      <label>
        <input
          type="checkbox"
          onchange={(event) => item.classList.toggle('done', event.currentTarget.checked)}
        />
        <span>{props.text}</span>
      </label>
      <button
        class="ghost"
        aria-label={`Remove ${props.text}`}
        onclick={() => item.dispatchEvent(new CustomEvent('todo-remove', { bubbles: true }))}
      >
        <Icon path={TRASH} />
      </button>
    </li>
  ) as HTMLLIElement;

  return item;
}

function App() {
  const count = (<span class="count" />) as HTMLSpanElement;
  const input = (
    <input name="todo" placeholder="What needs doing?" autocomplete="off" required />
  ) as HTMLInputElement;
  const list = (
    <ul
      class="list"
      ontodo-remove={(event) => {
        (event.target as Element).remove();
        updateCount();
      }}
    />
  ) as HTMLUListElement;

  function updateCount() {
    count.textContent = `${list.children.length} items`;
  }

  function add(text: string) {
    list.append(<TodoItem text={text} />);
    updateCount();
  }

  ['Try @fiorejs/jsx', 'Create the GitHub repo', 'Publish 0.1.0'].forEach(add);

  return (
    <main class="app">
      <header>
        <h1>
          Fiore <small>+ JSX</small>
        </h1>
        {count}
      </header>
      <form
        class="add"
        onsubmit={(event) => {
          event.preventDefault();
          add(input.value.trim());
          input.value = '';
          input.focus();
        }}
      >
        {input}
        <button type="submit">
          <Icon path={PLUS} />
          Add
        </button>
      </form>
      {list}
      <p class="hint">
        No virtual DOM: every JSX expression returns a real element, and updates are plain DOM calls.
      </p>
    </main>
  );
}

document.body.append(<App />);
