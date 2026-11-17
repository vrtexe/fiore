// The tutorial's lessons, by chapter. `body` is HTML; `code` is the starting code and `solution` the finished one.
// Every lesson runs as an ES module in the preview, with `fiorejs` and `@fiorejs/signals` 2.1 in its import map.

export const chapters = [
  {
    title: 'Introduction',
    lessons: [
      {
        slug: 'welcome',
        title: 'Welcome to fiore',
        body: `
<p>fiore creates HTML, SVG and MathML elements in JavaScript with one function per tag. Each function returns a real
DOM element, ready to append, so there is no virtual DOM and nothing to unwrap.</p>
<p>The editor on the right is a JavaScript module. It imports tag functions from <code>fiorejs</code> and appends
what they create to the page; the preview below it runs your code as you type.</p>
<p>Change the text of the heading and watch the preview update.</p>`,
        code: `import { h1 } from 'fiorejs';

document.body.append(h1('Hello world'));
`,
        solution: `import { h1 } from 'fiorejs';

document.body.append(h1('Hello fiore'));
`,
      },
      {
        slug: 'children',
        title: 'Children',
        body: `
<p>A tag function takes its children: a string, a number, a node, or an array of these. Arrays can be nested, and
<code>null</code>, <code>undefined</code>, <code>true</code> and <code>false</code> are skipped, so
<code>isAdmin &amp;&amp; badge()</code> works inside a list of children.</p>
<pre><code class="language-js">p(['Hello ', strong('world'), '!'])</code></pre>
<p>Make the paragraph say <em>fiore is <strong>fast</strong></em>, with the last word in a <code>strong</code>.</p>`,
        code: `import { p, strong } from 'fiorejs';

document.body.append(p('fiore is fast'));
`,
        solution: `import { p, strong } from 'fiorejs';

document.body.append(p(['fiore is ', strong('fast')]));
`,
      },
      {
        slug: 'props',
        title: 'Props',
        body: `
<p>Every tag function has builder methods. <code>props(map)</code> sets JavaScript properties of the element, such as
<code>className</code>, <code>value</code> or <code>style</code>. A <code>style</code> object is merged into the
element's inline style. <code>create(children)</code> then creates the element.</p>
<pre><code class="language-js">input.props({ placeholder: 'Your name' }).create()</code></pre>
<p>Give the box a <code>style</code> prop with a <code>padding</code> of <code>'16px'</code> and a
<code>background</code> of <code>'#eef'</code>.</p>`,
        code: `import { div } from 'fiorejs';

document.body.append(div.props({ className: 'box' }).create('A box'));
`,
        solution: `import { div } from 'fiorejs';

document.body.append(
  div.props({ className: 'box', style: { padding: '16px', background: '#eef' } }).create('A box'),
);
`,
      },
      {
        slug: 'attributes',
        title: 'Attributes',
        body: `
<p>Attributes are not the same as properties, and fiore keeps them apart. <code>attrs(map)</code> calls
<code>setAttribute</code>, which suits names such as <code>aria-label</code> and <code>data-id</code>, and every
attribute of an SVG element.</p>
<p>A value of <code>null</code>, <code>undefined</code> or <code>false</code> leaves the attribute out, while
<code>0</code> and an empty string are set.</p>
<p>Make the link open in a new tab with <code>target: '_blank'</code>, and add a <code>data-id</code> attribute of
<code>'42'</code>.</p>`,
        code: `import { a } from 'fiorejs';

document.body.append(a.attrs({ href: 'https://example.com' }).create('Example'));
`,
        solution: `import { a } from 'fiorejs';

document.body.append(
  a.attrs({ href: 'https://example.com', target: '_blank', 'data-id': '42' }).create('Example'),
);
`,
      },
      {
        slug: 'events',
        title: 'Events',
        body: `
<p><code>on(map)</code> adds event listeners. The key is the event name and the value is a function that gets the
event. To pass options, give an object with <code>handler</code> and <code>options</code>. Listeners added by several
calls to <code>on</code> never replace each other.</p>
<pre><code class="language-js">button.on({ click: (event) => console.log(event.currentTarget) }).create('Log')</code></pre>
<p>Add a <code>click</code> listener that changes the text of the button to <code>'Clicked'</code> through
<code>event.currentTarget.textContent</code>.</p>`,
        code: `import { button } from 'fiorejs';

document.body.append(button.create('Click me'));
`,
        solution: `import { button } from 'fiorejs';

document.body.append(
  button
    .on({
      click: (event) => {
        event.currentTarget.textContent = 'Clicked';
      },
    })
    .create('Click me'),
);
`,
      },
      {
        slug: 'plain-calls',
        title: 'Plain calls and the data object',
        body: `
<p>A tag can also be called directly. A plain object is read as the data object, whose keys are <code>props</code>,
<code>attrs</code>, <code>on</code> and <code>children</code>. Anything else is the children. So
<code>p('Hello')</code> is short for <code>p.create('Hello')</code>.</p>
<pre><code class="language-js">p({ props: { className: 'lead' }, children: 'Hello' })</code></pre>
<p>Because a plain object is the data object, text that comes from outside, such as parsed JSON, goes through
<code>create(value)</code>.</p>
<p>Rewrite the call with the data object: add a <code>className</code> prop of <code>'lead'</code> and a
<code>title</code> attribute.</p>`,
        code: `import { p } from 'fiorejs';

document.body.append(p('Plain calls are short.'));
`,
        solution: `import { p } from 'fiorejs';

document.body.append(
  p({
    props: { className: 'lead' },
    attrs: { title: 'Intro' },
    children: 'Plain calls are short.',
  }),
);
`,
      },
    ],
  },
  {
    title: 'Builders',
    lessons: [
      {
        slug: 'builders',
        title: 'Builders as templates',
        body: `
<p>Each builder method returns a new builder and leaves the old one unchanged. A builder is therefore a template:
keep the common settings in a constant and create as many elements from it as you like.</p>
<pre><code class="language-js">const card = div.props({ className: 'card' });
card.attrs({ title: 'Special' }).create('B');</code></pre>
<p>The code below creates two cards. Create a third card from <code>card</code> that has a <code>title</code>
attribute of <code>'Special'</code>, without changing <code>card</code> itself.</p>`,
        code: `import { div } from 'fiorejs';

const card = div.props({ className: 'card', style: { border: '1px solid #999', padding: '8px' } });

document.body.append(card.create('First'), card.create('Second'));
`,
        solution: `import { div } from 'fiorejs';

const card = div.props({ className: 'card', style: { border: '1px solid #999', padding: '8px' } });

document.body.append(
  card.create('First'),
  card.create('Second'),
  card.attrs({ title: 'Special' }).create('Third'),
);
`,
      },
      {
        slug: 'with',
        title: 'Reusable modifiers with with()',
        body: `
<p><code>with(fn)</code> calls <code>fn</code> with the builder and uses the builder it returns. A function that
takes a builder and returns one is a modifier, and modifiers can be shared between tags and combined.</p>
<pre><code class="language-js">const rounded = (b) => b.props({ style: { borderRadius: '8px' } });
div.with(rounded).create('Hi');</code></pre>
<p>Props combine key by key, and a later key wins. Two modifiers that both set <code>style</code> therefore do not
merge: the second <code>style</code> object replaces the first. Give each modifier its own keys.</p>
<p>Write a modifier <code>labelled</code> that sets the <code>aria-label</code> attribute to <code>'Notice'</code>, and
apply it to the <code>div</code> after <code>rounded</code>.</p>`,
        code: `import { div } from 'fiorejs';

const rounded = (b) => b.props({ style: { borderRadius: '8px', border: '1px solid #999', padding: '16px' } });

document.body.append(div.with(rounded).create('A rounded box'));
`,
        solution: `import { div } from 'fiorejs';

const rounded = (b) => b.props({ style: { borderRadius: '8px', border: '1px solid #999', padding: '16px' } });
const labelled = (b) => b.attrs({ 'aria-label': 'Notice' });

document.body.append(div.with(rounded).with(labelled).create('A rounded box'));
`,
      },
      {
        slug: 'also',
        title: 'Reaching the element with also()',
        body: `
<p><code>also(fn)</code> calls <code>fn</code> with the created element, after the props, attributes, children and
listeners are applied. Use it to keep a reference to the element. The element is not in the document yet while
<code>fn</code> runs, so focusing or measuring does not work there; do that after you append it.</p>
<pre><code class="language-js">let field;
input.also((element) => (field = element)).create();</code></pre>
<p>Store the input in a variable with <code>also</code>, then focus it after it is appended.</p>`,
        code: `import { input } from 'fiorejs';

document.body.append(input.props({ placeholder: 'Type here' }).create());
`,
        solution: `import { input } from 'fiorejs';

let field;

document.body.append(
  input
    .props({ placeholder: 'Type here' })
    .also((element) => (field = element))
    .create(),
);

field.focus();
`,
      },
      {
        slug: 'fragments',
        title: 'Fragments',
        body: `
<p><code>fragment(children)</code> returns a <code>DocumentFragment</code>: a group of nodes without a wrapping
element. It takes the same children as a tag. It is useful where a wrapper is not allowed, such as the term and the
description inside a <code>dl</code>.</p>
<pre><code class="language-js">fragment([dt('Name'), dd('fiore')])</code></pre>
<p>The code wraps each pair in a <code>div</code>. Replace the <code>div</code> with <code>fragment</code> so the
<code>dt</code> and <code>dd</code> elements sit directly in the list.</p>`,
        code: `import { dd, div, dl, dt } from 'fiorejs';

const terms = [
  { name: 'Props', text: 'JavaScript properties' },
  { name: 'Attrs', text: 'Attributes' },
];

document.body.append(dl.create(terms.map((term) => div([dt(term.name), dd(term.text)]))));
`,
        solution: `import { dd, dl, dt, fragment } from 'fiorejs';

const terms = [
  { name: 'Props', text: 'JavaScript properties' },
  { name: 'Attrs', text: 'Attributes' },
];

document.body.append(dl.create(terms.map((term) => fragment([dt(term.name), dd(term.text)]))));
`,
      },
      {
        slug: 'element-by-name',
        title: 'Elements by name',
        body: `
<p>Every tag is also available by name: <code>element(name)</code> returns a tag function with the same builder
methods. This helps when the tag name is data, or when the element is a custom one such as
<code>x-note</code>.</p>
<pre><code class="language-js">element('x-note').create('Hello')</code></pre>
<p>Add <code>'h3'</code> to the list of names, and give every heading a <code>title</code> attribute equal to its
name.</p>`,
        code: `import { element } from 'fiorejs';

const names = ['h1', 'h2'];

document.body.append(...names.map((name) => element(name).create(name)));
`,
        solution: `import { element } from 'fiorejs';

const names = ['h1', 'h2', 'h3'];

document.body.append(...names.map((name) => element(name).attrs({ title: name }).create(name)));
`,
      },
      {
        slug: 'svg',
        title: 'SVG',
        body: `
<p>SVG elements live in their own namespace, so they come from <code>fiorejs/svg</code>. The functions work the
same way. Most SVG properties are read-only objects, so set SVG settings with <code>attrs</code>.</p>
<pre><code class="language-js">import { svg, circle } from 'fiorejs/svg';</code></pre>
<p>Add a <code>rect</code> to the drawing, 40 wide and 20 high, at <code>x</code> 10 and <code>y</code> 60.</p>`,
        code: `import { circle, svg } from 'fiorejs/svg';

document.body.append(
  svg.attrs({ width: 100, height: 100, viewBox: '0 0 100 100' }).create([
    circle.attrs({ cx: 50, cy: 30, r: 20, fill: 'tomato' }).create(),
  ]),
);
`,
        solution: `import { circle, rect, svg } from 'fiorejs/svg';

document.body.append(
  svg.attrs({ width: 100, height: 100, viewBox: '0 0 100 100' }).create([
    circle.attrs({ cx: 50, cy: 30, r: 20, fill: 'tomato' }).create(),
    rect.attrs({ x: 10, y: 60, width: 40, height: 20, fill: 'steelblue' }).create(),
  ]),
);
`,
      },
      {
        slug: 'mathml',
        title: 'MathML',
        body: `
<p>MathML works the same way, from <code>fiorejs/math</code>. <code>math</code> is the root, and
<code>mi</code>, <code>mn</code> and <code>mo</code> are identifiers, numbers and operators. Layout elements such as
<code>msup</code> (a superscript) and <code>mfrac</code> (a fraction) take their parts as children.</p>
<pre><code class="language-js">msup.create([mi('x'), mn(2)])</code></pre>
<p>Write the formula as <em>x squared</em> by wrapping <code>mi('x')</code> and <code>mn('2')</code> in an
<code>msup</code>.</p>`,
        code: `import { math, mi, mn } from 'fiorejs/math';

document.body.append(math.create([mi('x'), mn('2')]));
`,
        solution: `import { math, mi, mn, msup } from 'fiorejs/math';

document.body.append(math.create(msup.create([mi('x'), mn('2')])));
`,
      },
    ],
  },
  {
    title: 'Signals',
    lessons: [
      {
        slug: 'state',
        title: 'State',
        body: `
<p><code>@fiorejs/signals</code> adds values that the DOM can follow. <code>state(value)</code> creates one, with
<code>get()</code> to read it and <code>set(value)</code> to change it. Setting an equal value does nothing.</p>
<p>A signal can be used directly as a child. fiore then keeps that spot of the page in step with the value, and
nothing else is touched. Reading the value with <code>get()</code> only gives you the value at that moment.</p>
<pre><code class="language-js">span(count) // follows count
span(count.get()) // shows the value once</code></pre>
<p>The paragraph below shows the count once, so the button does nothing visible. Pass the signal itself.</p>`,
        code: `import { button, p } from 'fiorejs';
import { state } from '@fiorejs/signals';

const count = state(0);

document.body.append(
  p(['Count: ', count.get()]),
  button.on({ click: () => count.set(count.get() + 1) }).create('Add one'),
);
`,
        solution: `import { button, p } from 'fiorejs';
import { state } from '@fiorejs/signals';

const count = state(0);

document.body.append(
  p(['Count: ', count]),
  button.on({ click: () => count.set(count.get() + 1) }).create('Add one'),
);
`,
      },
      {
        slug: 'computed',
        title: 'Computed values',
        body: `
<p><code>computed(fn)</code> derives a value from other signals. It is calculated when it is read and again after
one of its inputs changed. A plain function is never live in fiore, so wrap a derived value in
<code>computed</code> to bind it.</p>
<p>When a value comes from a single signal, <code>count.computed(fn)</code> is shorter. It also does not update
the DOM again when the result is equal to the last one.</p>
<pre><code class="language-js">const double = computed(() => count.get() * 2);
const isEven = count.computed((n) => n % 2 === 0);</code></pre>
<p>Show the double of the count in a second paragraph, and in a third one the text <code>even</code> or
<code>odd</code> from a <code>count.computed</code>.</p>`,
        code: `import { button, p } from 'fiorejs';
import { state } from '@fiorejs/signals';

const count = state(1);

document.body.append(
  p(['Count: ', count]),
  button.on({ click: () => count.set(count.get() + 1) }).create('Add one'),
);
`,
        solution: `import { button, p } from 'fiorejs';
import { computed, state } from '@fiorejs/signals';

const count = state(1);
const double = computed(() => count.get() * 2);

document.body.append(
  p(['Count: ', count]),
  p(['Double: ', double]),
  p(count.computed((n) => (n % 2 === 0 ? 'even' : 'odd'))),
  button.on({ click: () => count.set(count.get() + 1) }).create('Add one'),
);
`,
      },
      {
        slug: 'update-mutate',
        title: 'Update and mutate',
        body: `
<p><code>update(fn)</code> sets the value that <code>fn</code> returns from the current one, so you do not read the
value yourself. A signal tracks its value, not what is inside it: an array you change in place looks unchanged.
Replace it with a new array, or call <code>mutate(fn)</code>, which changes the value in place and still notifies.</p>
<pre><code class="language-js">count.update((n) => n + 1);
items.mutate((list) => list.push('x'));</code></pre>
<p>Change the first button to use <code>update</code>, and the second one to add an item with <code>mutate</code>.</p>`,
        code: `import { button, p } from 'fiorejs';
import { state } from '@fiorejs/signals';

const count = state(0);
const items = state(['a']);

document.body.append(
  p(['Count: ', count]),
  p(['Items: ', items.computed((list) => list.join(', '))]),
  button.on({ click: () => count.set(count.get() + 1) }).create('Add one'),
  button.on({ click: () => items.set([...items.get(), 'x']) }).create('Add item'),
);
`,
        solution: `import { button, p } from 'fiorejs';
import { state } from '@fiorejs/signals';

const count = state(0);
const items = state(['a']);

document.body.append(
  p(['Count: ', count]),
  p(['Items: ', items.computed((list) => list.join(', '))]),
  button.on({ click: () => count.update((n) => n + 1) }).create('Add one'),
  button.on({ click: () => items.mutate((list) => list.push('x')) }).create('Add item'),
);
`,
      },
      {
        slug: 'bindings',
        title: 'Binding props and attributes',
        body: `
<p>A signal also binds to a prop or an attribute: <code>input.props({ value: name })</code> or
<code>div.attrs({ title: name })</code>. The element is updated whenever the signal changes. It works inside nested
props too, such as <code>style: { color: someSignal }</code>.</p>
<p>The binding goes one way, from the signal to the element, so keep a listener that writes the typed text back.</p>
<p>The input below writes into <code>name</code> but does not follow it, so the Reset button leaves the text in
place. Bind the input's <code>value</code> prop to <code>name</code>.</p>`,
        code: `import { button, input, p } from 'fiorejs';
import { state } from '@fiorejs/signals';

const name = state('fiore');

document.body.append(
  input.on({ input: (event) => name.set(event.currentTarget.value) }).create(),
  button.on({ click: () => name.set('') }).create('Reset'),
  p(['Hello ', name]),
);
`,
        solution: `import { button, input, p } from 'fiorejs';
import { state } from '@fiorejs/signals';

const name = state('fiore');

document.body.append(
  input
    .props({ value: name })
    .on({ input: (event) => name.set(event.currentTarget.value) })
    .create(),
  button.on({ click: () => name.set('') }).create('Reset'),
  p(['Hello ', name]),
);
`,
      },
      {
        slug: 'class-list',
        title: 'Classes with classList',
        body: `
<p><code>classList(entries)</code> builds the text of <code>className</code> or the <code>class</code> attribute.
Strings are always on. In an object, a key is on while its value is truthy, and the value can be a boolean, a
signal or a getter function.</p>
<pre><code class="language-js">classList(['card', { active, hidden: () => !visible.get() }])</code></pre>
<p>Replace the fixed class name with a <code>classList</code> that keeps <code>'card'</code> and adds
<code>'active'</code> while the <code>active</code> signal is true.</p>`,
        code: `import { button, div, style } from 'fiorejs';
import { state } from '@fiorejs/signals';

const active = state(false);

document.head.append(style('.active { background: gold; }'));

document.body.append(
  div.props({ className: 'card' }).create('A card'),
  button.on({ click: () => active.update((on) => !on) }).create('Toggle'),
);
`,
        solution: `import { button, div, style } from 'fiorejs';
import { classList, state } from '@fiorejs/signals';

const active = state(false);

document.head.append(style('.active { background: gold; }'));

document.body.append(
  div.props({ className: classList(['card', { active }]) }).create('A card'),
  button.on({ click: () => active.update((on) => !on) }).create('Toggle'),
);
`,
      },
      {
        slug: 'effects',
        title: 'Effects',
        body: `
<p><code>effect(fn)</code> runs <code>fn</code> now, and again after any signal it read changed. Use it for work
outside the DOM bindings, such as logging, storage or the document title. It returns a function that stops it.</p>
<pre><code class="language-js">effect(() => console.log('count is', count.get()));</code></pre>
<p>Add an effect that sets <code>document.title</code> to <code>'Count: '</code> followed by the count.</p>`,
        code: `import { button, p } from 'fiorejs';
import { state } from '@fiorejs/signals';

const count = state(0);

document.body.append(
  p(['Count: ', count]),
  button.on({ click: () => count.update((n) => n + 1) }).create('Add one'),
);
`,
        solution: `import { button, p } from 'fiorejs';
import { effect, state } from '@fiorejs/signals';

const count = state(0);

effect(() => {
  document.title = 'Count: ' + count.get();
});

document.body.append(
  p(['Count: ', count]),
  button.on({ click: () => count.update((n) => n + 1) }).create('Add one'),
);
`,
      },
      {
        slug: 'untrack',
        title: 'Reading without subscribing',
        body: `
<p>Reading a signal inside an effect, a computed or a binding subscribes to it. Sometimes you only want the
current value. <code>untrack(fn)</code> runs <code>fn</code> without subscribing to the signals it reads.</p>
<pre><code class="language-js">effect(() => console.log(a.get(), untrack(() => b.get())));</code></pre>
<p>The effect below logs again when either button is pressed. Change it so that only <code>query</code> reruns it,
and <code>page</code> is read without subscribing.</p>`,
        code: `import { button } from 'fiorejs';
import { effect, state } from '@fiorejs/signals';

const query = state('a');
const page = state(1);

effect(() => console.log('search', query.get(), 'page', page.get()));

document.body.append(
  button.on({ click: () => query.update((q) => q + 'a') }).create('Change query'),
  button.on({ click: () => page.update((n) => n + 1) }).create('Next page'),
);
`,
        solution: `import { button } from 'fiorejs';
import { effect, state, untrack } from '@fiorejs/signals';

const query = state('a');
const page = state(1);

effect(() => console.log('search', query.get(), 'page', untrack(() => page.get())));

document.body.append(
  button.on({ click: () => query.update((q) => q + 'a') }).create('Change query'),
  button.on({ click: () => page.update((n) => n + 1) }).create('Next page'),
);
`,
      },
      {
        slug: 'timing',
        title: 'When the DOM updates',
        body: `
<p>A write applies at once: after <code>count.set(1)</code>, <code>count.get()</code> returns 1. The effects and
bindings that read it run later, together, in one flush on a microtask. Several writes in a row cost one run of
each reader.</p>
<p>So the DOM is behind for the rest of the code that wrote the signal. <code>flush()</code> runs the waiting
updates now. In async code, <code>await tick()</code> waits until they have run.</p>
<pre><code class="language-js">count.set(2);
flush();
console.log(view.textContent); // '2'</code></pre>
<p>The log below shows the old text. Call <code>flush()</code> before it, so it shows <code>1</code>. Then set the
count to 2 and use <code>await tick()</code> before logging again.</p>`,
        code: `import { p } from 'fiorejs';
import { state } from '@fiorejs/signals';

const count = state(0);
const view = p(count);
document.body.append(view);

count.set(1);
console.log('text:', view.textContent);
`,
        solution: `import { p } from 'fiorejs';
import { flush, state, tick } from '@fiorejs/signals';

const count = state(0);
const view = p(count);
document.body.append(view);

count.set(1);
flush();
console.log('text:', view.textContent);

count.set(2);
await tick();
console.log('text:', view.textContent);
`,
      },
    ],
  },
  {
    title: 'Lists and conditions',
    lessons: [
      {
        slug: 'lists',
        title: 'Lists',
        body: `
<p><code>signal.map(render)</code> renders a signal of an array. It reuses the rows of items it has seen before,
and only renders new ones. Pass the list directly as the children of its parent element.</p>
<pre><code class="language-js">ul(fruits.map((fruit) => li(fruit)))</code></pre>
<p>The list below is built once from <code>fruits.get()</code>, so adding a fruit changes nothing on the page.
Use <code>fruits.map</code> instead.</p>`,
        code: `import { button, li, ul } from 'fiorejs';
import { state } from '@fiorejs/signals';

const fruits = state(['apple', 'pear']);

document.body.append(
  ul(fruits.get().map((fruit) => li(fruit))),
  button.on({ click: () => fruits.update((list) => [...list, 'plum']) }).create('Add plum'),
);
`,
        solution: `import { button, li, ul } from 'fiorejs';
import { state } from '@fiorejs/signals';

const fruits = state(['apple', 'pear']);

document.body.append(
  ul(fruits.map((fruit) => li(fruit))),
  button.on({ click: () => fruits.update((list) => [...list, 'plum']) }).create('Add plum'),
);
`,
      },
      {
        slug: 'keyed-lists',
        title: 'Keyed lists',
        body: `
<p>With <code>map</code>, the item itself is the key, so an item replaced by a copy gets a new row.
<code>signal.for(key).map(render)</code> keys the rows by what <code>key</code> returns, for example an id. A row is
rendered once, so put the fields that change in signals.</p>
<pre><code class="language-js">todos.for((todo) => todo.id).map((todo) => li(todo.text))</code></pre>
<p>Pressing Add rebuilds every row, because the list is replaced with new objects. Key the list by
<code>todo.id</code> so the rows of existing items are kept.</p>`,
        code: `import { button, li, ul } from 'fiorejs';
import { state } from '@fiorejs/signals';

const todos = state([{ id: 1, text: 'Write docs' }]);
let next = 2;

document.body.append(
  ul(
    todos.map((todo) => {
      console.log('render row', todo.id);
      return li(todo.text);
    }),
  ),
  button
    .on({ click: () => todos.update((list) => list.map((todo) => ({ ...todo })).concat({ id: next++, text: 'Item' })) })
    .create('Add'),
);
`,
        solution: `import { button, li, ul } from 'fiorejs';
import { state } from '@fiorejs/signals';

const todos = state([{ id: 1, text: 'Write docs' }]);
let next = 2;

document.body.append(
  ul(
    todos.for((todo) => todo.id).map((todo) => {
      console.log('render row', todo.id);
      return li(todo.text);
    }),
  ),
  button
    .on({ click: () => todos.update((list) => list.map((todo) => ({ ...todo })).concat({ id: next++, text: 'Item' })) })
    .create('Add'),
);
`,
      },
      {
        slug: 'conditions',
        title: 'Conditions with if and else',
        body: `
<p>A component runs once, so <code>open.get() ? a : b</code> is read once and never switches.
<code>signal.if(then)</code> is the live version: it shows what <code>then</code> returns while the value is
truthy, and <code>.else(otherwise)</code> adds the other branch. Both are functions, so only the shown branch is
built.</p>
<pre><code class="language-js">div(open.if(() => p('Details')).else(() => em('closed')))</code></pre>
<p>The text below is chosen once. Replace it with <code>open.if(...).else(...)</code> so it follows the button.</p>`,
        code: `import { button, div, em, p } from 'fiorejs';
import { state } from '@fiorejs/signals';

const open = state(false);

document.body.append(
  button.on({ click: () => open.update((value) => !value) }).create('Toggle'),
  div(open.get() ? p('Some details') : em('closed')),
);
`,
        solution: `import { button, div, em, p } from 'fiorejs';
import { state } from '@fiorejs/signals';

const open = state(false);

document.body.append(
  button.on({ click: () => open.update((value) => !value) }).create('Toggle'),
  div(open.if(() => p('Some details')).else(() => em('closed'))),
);
`,
      },
      {
        slug: 'case',
        title: 'Several branches with case',
        body: `
<p><code>signal.case(match, render)</code> shows what <code>render</code> returns while the value matches. A
function is a test on the value, and any other value is compared with <code>Object.is</code>. Chain more cases;
the first match wins. <code>.else(otherwise)</code> covers the rest.</p>
<pre><code class="language-js">status.case('loading', () => 'Loading').case('error', () => 'Failed').else(() => 'Done')</code></pre>
<p>Add a case for <code>'error'</code> that shows <code>'Something went wrong'</code>, and one for
<code>'done'</code> that shows <code>'Finished'</code>.</p>`,
        code: `import { button, div } from 'fiorejs';
import { state } from '@fiorejs/signals';

const status = state('loading');

document.body.append(
  div(status.case('loading', () => 'Loading').else(() => 'Unknown')),
  button.on({ click: () => status.set('done') }).create('Finish'),
  button.on({ click: () => status.set('error') }).create('Fail'),
);
`,
        solution: `import { button, div } from 'fiorejs';
import { state } from '@fiorejs/signals';

const status = state('loading');

document.body.append(
  div(
    status
      .case('loading', () => 'Loading')
      .case('error', () => 'Something went wrong')
      .case('done', () => 'Finished')
      .else(() => 'Unknown'),
  ),
  button.on({ click: () => status.set('done') }).create('Finish'),
  button.on({ click: () => status.set('error') }).create('Fail'),
);
`,
      },
      {
        slug: 'resource',
        title: 'Loading data',
        body: `
<p><code>resource(source, fetcher)</code> calls <code>fetcher</code> with the value of <code>source</code>, and loads
again when <code>source</code> changes. The resource is a signal of the last loaded value. Its <code>loading</code>
and <code>error</code> are signals too. The fetcher may return a promise.</p>
<pre><code class="language-js">const user = resource(userId, (id) => loadUser(id));
user.loading.get(); // true while loading</code></pre>
<p>The fake <code>loadUser</code> answers after a short delay. Show <code>'Loading...'</code> while
<code>user.loading</code> is true, and the user's name once it has loaded.</p>`,
        code: `import { button, p } from 'fiorejs';
import { computed, resource, state } from '@fiorejs/signals';

const loadUser = (id) => new Promise((resolve) => setTimeout(() => resolve({ name: 'User ' + id }), 20));

const userId = state(1);
const user = resource(userId, (id) => loadUser(id));

document.body.append(
  p(computed(() => JSON.stringify(user.get()))),
  button.on({ click: () => userId.update((id) => id + 1) }).create('Next user'),
);
`,
        solution: `import { button, p } from 'fiorejs';
import { computed, resource, state } from '@fiorejs/signals';

const loadUser = (id) => new Promise((resolve) => setTimeout(() => resolve({ name: 'User ' + id }), 20));

const userId = state(1);
const user = resource(userId, (id) => loadUser(id));

document.body.append(
  p(computed(() => (user.loading.get() ? 'Loading...' : user.get().name))),
  button.on({ click: () => userId.update((id) => id + 1) }).create('Next user'),
);
`,
      },
    ],
  },
  {
    title: 'Structure',
    lessons: [
      {
        slug: 'components',
        title: 'Components',
        body: `
<p>A component is a function that returns an element. It runs once and builds its elements once, so pass it
signals, not their current values. <code>Reactive&lt;T&gt;</code> in the types means a plain value or a signal, and
<code>read(value)</code> unwraps either.</p>
<pre><code class="language-js">function Price(amount) {
  return span(computed(() => read(amount).toFixed(2)));
}</code></pre>
<p>The two counters below repeat the same code. Extract a <code>Counter(label)</code> function that creates its
own state and returns the paragraph and the button, and call it twice.</p>`,
        code: `import { button, div, p } from 'fiorejs';
import { state } from '@fiorejs/signals';

const first = state(0);
const second = state(0);

document.body.append(
  div([p(['First: ', first]), button.on({ click: () => first.update((n) => n + 1) }).create('Add')]),
  div([p(['Second: ', second]), button.on({ click: () => second.update((n) => n + 1) }).create('Add')]),
);
`,
        solution: `import { button, div, p } from 'fiorejs';
import { state } from '@fiorejs/signals';

function Counter(label) {
  const count = state(0);
  return div([p([label + ': ', count]), button.on({ click: () => count.update((n) => n + 1) }).create('Add')]);
}

document.body.append(Counter('First'), Counter('Second'));
`,
      },
      {
        slug: 'shared-state',
        title: 'Shared state',
        body: `
<p>A signal created at the top of a module is shared by everything that uses it. Components that read or write the
same signal stay in step without passing anything to each other.</p>
<pre><code class="language-js">// store.js
export const user = state(null);</code></pre>
<p>The badge and the button below each have a state of their own, so the badge never changes. Move the state out of
the components so both use the same one.</p>`,
        code: `import { button, span } from 'fiorejs';
import { state } from '@fiorejs/signals';

function Badge() {
  const count = state(0);
  return span(['Clicks: ', count]);
}

function AddButton() {
  const count = state(0);
  return button.on({ click: () => count.update((n) => n + 1) }).create('Click');
}

document.body.append(Badge(), AddButton());
`,
        solution: `import { button, span } from 'fiorejs';
import { state } from '@fiorejs/signals';

const count = state(0);

function Badge() {
  return span(['Clicks: ', count]);
}

function AddButton() {
  return button.on({ click: () => count.update((n) => n + 1) }).create('Click');
}

document.body.append(Badge(), AddButton());
`,
      },
      {
        slug: 'effect-cleanup',
        title: 'Effect cleanups',
        body: `
<p>If the function of an effect returns a function, that function runs before the next run of the effect and when
the effect stops. Use it to undo what the run set up, such as a timer or a listener. <code>effect</code> returns a
function that stops it.</p>
<pre><code class="language-js">const stop = effect(() => {
  const id = setInterval(tick, delay.get());
  return () => clearInterval(id);
});</code></pre>
<p>Return a function from the effect that logs <code>'leaving'</code> and the name, and call <code>stop()</code>
at the end.</p>`,
        code: `import { effect, state } from '@fiorejs/signals';

const name = state('a');

const stop = effect(() => {
  console.log('entering', name.get());
});

name.set('b');
`,
        solution: `import { effect, flush, state } from '@fiorejs/signals';

const name = state('a');

const stop = effect(() => {
  const current = name.get();
  console.log('entering', current);
  return () => console.log('leaving', current);
});

name.set('b');
flush();
stop();
`,
      },
      {
        slug: 'root',
        title: 'Cleaning up with root',
        body: `
<p>Bindings and effects stop on their own when the content that created them is replaced. For the rest,
<code>root(fn)</code> runs <code>fn</code> with an owner of its own, and returns a function that stops everything
<code>fn</code> created: effects, bindings, computeds and lists. A root belongs to no other owner, so call its
function yourself.</p>
<pre><code class="language-js">const dispose = root(() => document.body.append(App()));
dispose();</code></pre>
<p>Wrap the creation of the page in <code>root</code>, and call the function it returns after the first update, so
the effect stops logging.</p>`,
        code: `import { p } from 'fiorejs';
import { effect, flush, state } from '@fiorejs/signals';

const count = state(0);

effect(() => console.log('count', count.get()));
document.body.append(p(count));

count.set(1);
flush();
count.set(2);
flush();
`,
        solution: `import { p } from 'fiorejs';
import { effect, flush, root, state } from '@fiorejs/signals';

const count = state(0);

const dispose = root(() => {
  effect(() => console.log('count', count.get()));
  document.body.append(p(count));
});

count.set(1);
flush();
dispose();
count.set(2);
flush();
`,
      },
    ],
  },
  {
    title: 'Finale',
    lessons: [
      {
        slug: 'todo-app',
        title: 'A small todo app',
        body: `
<p>This lesson combines what you learned. The app has a form that adds todos, a keyed list with checkboxes bound to
a state per todo, and a button that clears the finished ones.</p>
<p>Two parts are missing. Add a computed <code>remaining</code> that counts the todos that are not done and show
it as <code>'Remaining: '</code> followed by the number. Then show a paragraph <code>'Nothing to do'</code> while
the list is empty, with <code>if</code>.</p>`,
        code: `import { button, form, input, li, ul } from 'fiorejs';
import { state } from '@fiorejs/signals';

const todos = state([{ id: 1, text: 'Learn fiore', done: state(false) }]);
const text = state('');
let nextId = 2;

function Todo(todo) {
  return li([
    input
      .props({ type: 'checkbox', checked: todo.done })
      .on({ change: (event) => todo.done.set(event.currentTarget.checked) })
      .create(),
    ' ',
    todo.text,
  ]);
}

function add(event) {
  event.preventDefault();
  if (!text.get()) return;
  todos.update((list) => [...list, { id: nextId++, text: text.get(), done: state(false) }]);
  text.set('');
}

function clearDone() {
  todos.update((list) => list.filter((todo) => !todo.done.get()));
}

document.body.append(
  form
    .on({ submit: add })
    .create([
      input.props({ value: text, placeholder: 'What needs doing?' }).on({ input: (event) => text.set(event.currentTarget.value) }).create(),
      button.props({ type: 'submit' }).create('Add'),
    ]),
  ul(todos.for((todo) => todo.id).map(Todo)),
  button.props({ type: 'button' }).on({ click: clearDone }).create('Clear done'),
);
`,
        solution: `import { button, div, form, input, li, p, ul } from 'fiorejs';
import { computed, state } from '@fiorejs/signals';

const todos = state([{ id: 1, text: 'Learn fiore', done: state(false) }]);
const text = state('');
let nextId = 2;

const remaining = computed(() => todos.get().filter((todo) => !todo.done.get()).length);

function Todo(todo) {
  return li([
    input
      .props({ type: 'checkbox', checked: todo.done })
      .on({ change: (event) => todo.done.set(event.currentTarget.checked) })
      .create(),
    ' ',
    todo.text,
  ]);
}

function add(event) {
  event.preventDefault();
  if (!text.get()) return;
  todos.update((list) => [...list, { id: nextId++, text: text.get(), done: state(false) }]);
  text.set('');
}

function clearDone() {
  todos.update((list) => list.filter((todo) => !todo.done.get()));
}

document.body.append(
  form
    .on({ submit: add })
    .create([
      input.props({ value: text, placeholder: 'What needs doing?' }).on({ input: (event) => text.set(event.currentTarget.value) }).create(),
      button.props({ type: 'submit' }).create('Add'),
    ]),
  div(todos.computed((list) => list.length === 0).if(() => p('Nothing to do'))),
  ul(todos.for((todo) => todo.id).map(Todo)),
  p(['Remaining: ', remaining]),
  button.props({ type: 'button' }).on({ click: clearDone }).create('Clear done'),
);
`,
      },
    ],
  },
];
