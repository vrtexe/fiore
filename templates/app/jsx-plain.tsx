function TodoItem(props: { text: string }) {
  const item: HTMLLIElement = (
    <li class="item">
      <label>
        <input type="checkbox" onchange={(event) => item.classList.toggle('done', event.currentTarget.checked)} />
        <span>{props.text}</span>
      </label>
      <button
        class="ghost"
        aria-label={`Remove ${props.text}`}
        onclick={() => item.dispatchEvent(new CustomEvent('todo-remove', { bubbles: true }))}
      >
        ✕
      </button>
    </li>
  ) as HTMLLIElement;

  return item;
}

function App() {
  const count = (<span class="count" />) as HTMLSpanElement;
  const field = (<input name="todo" placeholder="What needs doing?" autocomplete="off" required />) as HTMLInputElement;
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

  ['Edit src/main.tsx', 'Add a component', 'Build something'].forEach(add);

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
          add(field.value.trim());
          field.value = '';
          field.focus();
        }}
      >
        {field}
        <button type="submit">Add</button>
      </form>
      {list}
      <p class="hint">No virtual DOM: every JSX expression returns a real element, and updates are plain DOM calls.</p>
    </main>
  );
}

document.body.append(<App />);
