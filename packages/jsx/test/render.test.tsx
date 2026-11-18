import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { LIVE } from 'fiorejs';
import { jsx, type Child } from '@fiorejs/jsx/jsx-runtime';

const { window } = new JSDOM();
Object.assign(globalThis, {
  document: window.document,
  Node: window.Node,
  customElements: window.customElements,
  HTMLElement: window.HTMLElement,
});

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
  assert.equal(card.textContent, 'Hello , ');

  await new Promise((resolve) => setTimeout(resolve));
  assert.equal(card.innerHTML, 'Hello <b>Ada</b>, <b>Grace</b>');
});

test('an async component works on its own', async () => {
  async function Name() {
    return <b>Ada</b>;
  }

  const node = <Name />;
  assert.ok(node instanceof window.Node);
  const host = document.createElement('div');
  host.append(node);

  await new Promise((resolve) => setTimeout(resolve));
  assert.equal(host.innerHTML, '<b>Ada</b>');
});

test('a rejected async component is reported and leaves its place empty', async (t) => {
  const errors: unknown[] = [];
  const previous = globalThis.reportError;
  globalThis.reportError = (error) => errors.push(error);
  t.after(() => {
    globalThis.reportError = previous;
  });
  async function Broken(): Promise<Node> {
    throw new Error('load failed');
  }

  const card = (
    <p>
      <Broken />
    </p>
  ) as HTMLParagraphElement;

  await new Promise((resolve) => setTimeout(resolve));
  assert.equal(card.textContent, '');
  assert.match(String(errors[0]), /load failed/);
});

test('an async component removed before it resolves stays out of the document', async () => {
  let resolve!: (node: Node) => void;
  const Late = () => new Promise<Node>((done) => (resolve = done));

  const card = (
    <p>
      <Late />
    </p>
  ) as HTMLParagraphElement;
  card.replaceChildren();
  resolve(document.createElement('b'));

  await new Promise((done) => setTimeout(done));
  assert.equal(card.innerHTML, '');
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
  // @ts-expect-error SVG props are typed per element
  void (<circle notAnAttribute={1} />);
  void ['a'].map((item) => <li key={item}>{item}</li>);
});

test('custom elements get object values as properties, also when defined after first use', () => {
  const early = (<x-late items={[1, 2]} />) as HTMLElement & { items?: unknown };
  assert.deepEqual(early.items, [1, 2]);
  assert.equal(early.hasAttribute('items'), false);

  window.customElements.define(
    'x-late',
    class extends window.HTMLElement {
      set label(value: string) {
        this.dataset.label = value;
      }
    },
  );
  const later = (<x-late label="hi" />) as HTMLElement;
  assert.equal(later.dataset.label, 'hi');
});

test('an element created before its class is defined keeps string props as attributes, with no setter call on upgrade', () => {
  const early = (<x-early label="hi" items={[1]} />) as HTMLElement & { items?: unknown };
  document.body.append(early);
  const labels: string[] = [];
  window.customElements.define(
    'x-early',
    class extends window.HTMLElement {
      set label(value: string) {
        labels.push(value);
      }
    },
  );

  assert.equal(early.getAttribute('label'), 'hi');
  assert.deepEqual(labels, []);
  assert.deepEqual(early.items, [1]);
  early.remove();
});

test('null removes an attribute instead of writing "null"', () => {
  const el = (<div id={null} title={null} style={null} />) as HTMLDivElement;

  assert.equal(el.hasAttribute('id'), false);
  assert.equal(el.hasAttribute('title'), false);
  assert.equal(el.hasAttribute('style'), false);
});

test('a string for a numeric property stays an attribute', () => {
  const image = (<img width="50%" />) as HTMLImageElement;

  assert.equal(image.getAttribute('width'), '50%');
});

test('key is accepted and ignored, also after a spread', () => {
  const props = { class: 'item' };
  const item = (
    <li {...props} key="k">
      x
    </li>
  ) as HTMLLIElement;

  assert.equal(item.className, 'item');
  assert.equal(item.hasAttribute('key'), false);
});

test('event handler names start with on in any case and listen to the event with its first letter lowercased', () => {
  let clicks = 0;
  const upper = jsx('button', { Onclick: () => clicks++ }) as HTMLButtonElement;
  const camel = (<button onClick={(event) => event.currentTarget && clicks++} />) as HTMLButtonElement;
  upper.dispatchEvent(new window.Event('click'));
  camel.dispatchEvent(new window.Event('click'));
  camel.dispatchEvent(new window.Event('Click'));

  assert.equal(clicks, 2);
  assert.equal(upper.hasAttribute('onclick'), false);
  assert.equal(camel.hasAttribute('onClick'), false);
});

test('select value is applied after its options', () => {
  const size = (
    <select value="b">
      <option>a</option>
      <option>b</option>
    </select>
  ) as HTMLSelectElement;

  assert.equal(size.value, 'b');
});

test('very deep children do not overflow the stack', () => {
  let deep: Child = 'x';
  for (let i = 0; i < 20000; i++) deep = [deep];

  assert.equal(((<div>{deep}</div>) as HTMLDivElement).textContent, 'x');
});

test('plain values and live values with the same name end up in the same place', () => {
  const cases: [tag: string, name: string, value: unknown, check: (el: any) => void][] = [
    ['div', 'title', 'tip', (el) => assert.equal(el.getAttribute('title'), 'tip')],
    ['div', 'title', null, (el) => assert.equal(el.hasAttribute('title'), false)],
    ['div', 'title', false, (el) => assert.equal(el.hasAttribute('title'), false)],
    ['div', 'id', 'main', (el) => assert.equal(el.id, 'main')],
    ['img', 'width', '50%', (el) => assert.equal(el.getAttribute('width'), '50%')],
    ['img', 'width', 100, (el) => assert.equal(el.width, 100)],
    ['button', 'disabled', true, (el) => assert.equal(el.disabled, true)],
    ['button', 'disabled', false, (el) => assert.equal(el.hasAttribute('disabled'), false)],
    ['div', 'hidden', true, (el) => assert.equal(el.hidden, true)],
    ['div', 'draggable', false, (el) => assert.equal(el.getAttribute('draggable'), 'false')],
    ['input', 'value', 'typed', (el) => (assert.equal(el.value, 'typed'), assert.equal(el.hasAttribute('value'), false))],
    ['input', 'checked', true, (el) => (assert.equal(el.checked, true), assert.equal(el.hasAttribute('checked'), false))],
    ['div', 'textContent', 'text', (el) => assert.equal(el.textContent, 'text')],
    ['div', 'className', 'box', (el) => assert.equal(el.getAttribute('class'), 'box')],
    ['audio', 'volume', 0.5, (el) => (assert.equal(el.volume, 0.5), assert.equal(el.hasAttribute('volume'), false))],
    ['option', 'text', 'Label', (el) => (assert.equal(el.textContent, 'Label'), assert.equal(el.hasAttribute('text'), false))],
    [
      'x-undefined',
      'className',
      'card',
      (el) => (assert.equal(el.getAttribute('class'), 'card'), assert.equal(el.hasAttribute('classname'), false)),
    ],
  ];
  for (const [tag, name, value, check] of cases) {
    const forms = { plain: value, live: { [LIVE]: (apply: (next: unknown) => void) => apply(value) } };
    for (const [form, input] of Object.entries(forms)) {
      try {
        check(jsx(tag, { [name]: input }));
      } catch (error) {
        throw new Error(`<${tag} ${name}={${form} ${JSON.stringify(value)}}>: ${(error as Error).message}`);
      }
    }
  }
});

test('a lone live child of a fragment keeps updating after the fragment is inserted', () => {
  const listeners: ((value: unknown) => void)[] = [];
  const live = {
    [LIVE](apply: (value: unknown) => void) {
      apply('a');
      listeners.push(apply);
    },
  };
  const host = (<div>{(<>{live}</>) as unknown as Child}</div>) as HTMLDivElement;
  listeners.forEach((apply) => apply('b'));

  assert.equal(host.textContent, 'b');
});

test('a key inside a spread object is ignored', () => {
  const props = { key: 'k', class: 'a' };
  const item = (<li {...props}>x</li>) as HTMLLIElement;

  assert.equal(item.hasAttribute('key'), false);
  assert.equal(item.className, 'a');
});

test('props named like DOM methods do not replace the methods', () => {
  const el = jsx('div', { click: 'x', setAttribute: 'x', 'aria-label': 'y' }) as HTMLDivElement;

  assert.equal(typeof el.click, 'function');
  assert.equal(el.getAttribute('aria-label'), 'y');
});

test('a fragment with a very long child list does not overflow', () => {
  const items = Array.from({ length: 200000 }, (_, i) => String(i % 10));

  assert.equal((<>{items}</>).childNodes.length, 200000);
});

test('ref gets the finished element, typed by its tag', () => {
  let field: HTMLInputElement | undefined;
  let circle: SVGCircleElement | undefined;
  let valueSeen = '';
  const form = (
    <form>
      <input value="Ada" ref={(element) => ((field = element), (valueSeen = element.value))} />
      <svg>
        <circle r="5" ref={(element) => (circle = element)} />
      </svg>
    </form>
  ) as HTMLFormElement;

  assert.equal(field, form.querySelector('input'));
  assert.equal(valueSeen, 'Ada');
  assert.equal(circle?.namespaceURI, 'http://www.w3.org/2000/svg');
  assert.equal(form.querySelector('input')?.hasAttribute('ref'), false);
});

test('listeners take the event name as written after on, with its first letter lowercased', () => {
  const heard: string[] = [];
  const box = (
    <my-picker
      onclick={(event: Event) => heard.push(event.type)}
      onvalueChanged={(event: Event) => heard.push(event.type)}
      onIonChange={(event: Event) => heard.push(event.type)}
      onpicker-open={(event: CustomEvent) => heard.push(event.type)}
    />
  ) as HTMLElement;
  for (const name of ['click', 'valueChanged', 'valuechanged', 'ionChange', 'ionchange', 'picker-open']) {
    box.dispatchEvent(new window.CustomEvent(name));
  }

  assert.deepEqual(heard, ['click', 'valueChanged', 'ionChange', 'picker-open']);
});
