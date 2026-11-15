function TodoItem(props) {
  const item = (
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
  );

  return item;
}

function App() {
  const count = <span class="count" />;
  const field = <input name="todo" placeholder="What needs doing?" autocomplete="off" required />;
  const list = (
    <ul
      class="list"
      ontodo-remove={(event) => {
        event.target.remove();
        updateCount();
      }}
    />
  );

  function updateCount() {
    count.textContent = `${list.children.length} items`;
  }

  function add(text) {
    list.append(<TodoItem text={text} />);
    updateCount();
  }

  ['Edit src/main.jsx', 'Add a component', 'Build something'].forEach(add);

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
