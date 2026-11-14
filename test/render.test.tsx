import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import type { Child } from '@fiorejs/jsx/jsx-runtime';

const { window } = new JSDOM();
Object.assign(globalThis, { document: window.document, Node: window.Node });

test('flat props become properties, attributes and listeners', () => {
  let clicked: HTMLButtonElement | undefined;
  const button = (
    <button class="btn" aria-label="Save" type="submit" onclick={(event) => (clicked = event.currentTarget)}>
      Save
    </button>
  ) as HTMLButtonElement;

  button.click();

  assert.equal(button.getAttribute('class'), 'btn');
  assert.equal(button.getAttribute('aria-label'), 'Save');
  assert.equal(button.type, 'submit');
  assert.equal(button.textContent, 'Save');
  assert.equal(clicked, button);
});

test('read-only properties fall back to attributes', () => {
  const input = (<input value="typed" list="suggestions" />) as HTMLInputElement;

  assert.equal(input.value, 'typed');
  assert.equal(input.getAttribute('value'), null);
  assert.equal(input.getAttribute('list'), 'suggestions');
});

test('style accepts an object or a string', () => {
  const object = (<div style={{ height: '10px' }} />) as HTMLDivElement;
  const string = (<div style="width: 5px" />) as HTMLDivElement;

  assert.equal(object.style.height, '10px');
  assert.equal(string.style.width, '5px');
});

test('svg tags are created in the svg namespace with attributes', () => {
  const icon = (
    <svg viewBox="0 0 10 10" class="icon">
      <path d="M0 0L10 10" />
    </svg>
  ) as SVGSVGElement;

  assert.equal(icon.namespaceURI, 'http://www.w3.org/2000/svg');
  assert.equal(icon.firstElementChild?.namespaceURI, 'http://www.w3.org/2000/svg');
  assert.equal(icon.getAttribute('viewBox'), '0 0 10 10');
  assert.equal(icon.getAttribute('class'), 'icon');
});

test('children flatten arrays and fragments and skip empty values', () => {
  const items = ['a', 'b'];
  const list = (
    <ul>
      {items.map((item) => (
        <li>{item}</li>
      ))}
      {false}
      {null}
      <>
        {1}
        <b>2</b>
      </>
    </ul>
  ) as HTMLUListElement;

  assert.equal(list.innerHTML, '<li>a</li><li>b</li>1<b>2</b>');
});

test('function components receive props and children', () => {
  function Card(props: { title: string; children?: Child }) {
    return (
      <section>
        <h2>{props.title}</h2>
        {props.children}
      </section>
    );
  }

  const card = (<Card title="Hello">body</Card>) as HTMLElement;

  assert.equal(card.outerHTML, '<section><h2>Hello</h2>body</section>');
});

test('on prefix listens to any event name, with options', () => {
  const details: unknown[] = [];
  let keys = 0;
  const box = (
    <div
      oncart-add={(event) => details.push(event.detail)}
      onkeydown={{ handler: () => keys++, options: { once: true } }}
    />
  ) as HTMLDivElement;

  box.dispatchEvent(new window.CustomEvent('cart-add', { detail: 42 }));
  box.dispatchEvent(new window.KeyboardEvent('keydown'));
  box.dispatchEvent(new window.KeyboardEvent('keydown'));

  assert.deepEqual(details, [42]);
  assert.equal(keys, 1);
});

test('async components are inserted once they resolve, also inside fragments', async () => {
  async function Name(props: { value: string }) {
    await Promise.resolve();
    return <b>{props.value}</b>;
  }

  const card = (
    <p>
      Hello <Name value="Ada" />
      <>
        , <Name value="Grace" />
      </>
    </p>
  ) as HTMLParagraphElement;
  assert.equal(card.innerHTML, 'Hello , ');

  await new Promise((resolve) => setTimeout(resolve));
  assert.equal(card.innerHTML, 'Hello <b>Ada</b>, <b>Grace</b>');
});

test('types reject unknown props and mismatched listeners', () => {
  // @ts-expect-error unknown event name
  void (<button onclik={() => {}} />);
  // @ts-expect-error click is not a keyboard event
  void (<button onclick={(event: KeyboardEvent) => event.key} />);
  // @ts-expect-error popstate only exists on body
  void (<div onpopstate={() => {}} />);
  void (<body onpopstate={(event) => event.state} />);
  void (<my-widget any-prop="1" onclick={() => {}} />);
});
