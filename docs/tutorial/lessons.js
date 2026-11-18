// The tutorial's lessons, by chapter. `body` is HTML; `code` is the starting code and `solution` the finished one.
// `jsx` holds the same lesson for JSX readers; body text that differs by syntax carries `data-syntax`.
// Every lesson runs as an ES module in the preview, with `fiorejs` and `@fiorejs/signals` 2.2 in its import map.

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
        jsx: {
          code: `document.body.append(<h1>Hello world</h1>);
`,
          solution: `document.body.append(<h1>Hello fiore</h1>);
`,
        },
      },
      {
        slug: 'children',
        title: 'Children',
        body: `
<p data-syntax="builder">A tag function takes its children: a string, a number, a node, or an array of these. Arrays can be nested, and
<code>null</code>, <code>undefined</code>, <code>true</code> and <code>false</code> are skipped, so
<code>isAdmin &amp;&amp; badge()</code> works inside a list of children.</p>
<pre data-syntax="builder"><code class="language-js">p(['Hello ', strong('world'), '!'])</code></pre>
<p data-syntax="jsx">The children of a JSX element are what you write between its tags: text, numbers, nodes, or arrays of these.
Arrays can be nested, and <code>null</code>, <code>undefined</code>, <code>true</code> and <code>false</code> are
skipped, so <code>{isAdmin &amp;&amp; &lt;Badge /&gt;}</code> works.</p>
<pre data-syntax="jsx"><code class="language-jsx">&lt;p&gt;Hello &lt;strong&gt;world&lt;/strong&gt;!&lt;/p&gt;</code></pre>
<p>Make the paragraph say <em>fiore is <strong>fast</strong></em>, with the last word in a <code>strong</code>.</p>`,
        code: `import { p, strong } from 'fiorejs';

document.body.append(p('fiore is fast'));
`,
        solution: `import { p, strong } from 'fiorejs';

document.body.append(p(['fiore is ', strong('fast')]));
`,
        jsx: {
          code: `document.body.append(<p>fiore is fast</p>);
`,
          solution: `document.body.append(
  <p>
    fiore is <strong>fast</strong>
  </p>,
);
`,
        },
      },
      {
        slug: 'props',
        title: 'Props',
        body: `
<p data-syntax="builder">Every tag function has builder methods. <code>props(map)</code> sets JavaScript properties of the element, such as
<code>className</code>, <code>value</code> or <code>style</code>. A <code>style</code> object is merged into the
element's inline style. <code>create(children)</code> then creates the element.</p>
<pre data-syntax="builder"><code class="language-js">input.props({ placeholder: 'Your name' }).create()</code></pre>
<p data-syntax="jsx">In JSX every prop is written on the tag. A name such as <code>className</code>, <code>textContent</code>
or <code>value</code> sets the JavaScript property of the element. A <code>style</code> object is merged into the
element's inline style.</p>
<pre data-syntax="jsx"><code class="language-jsx">&lt;input value="Ada" style={{ color: 'tomato' }} /&gt;</code></pre>
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
        jsx: {
          code: `document.body.append(<div className="box">A box</div>);
`,
          solution: `document.body.append(
  <div className="box" style={{ padding: '16px', background: '#eef' }}>
    A box
  </div>,
);
`,
        },
      },
      {
        slug: 'attributes',
        title: 'Attributes',
        body: `
<p data-syntax="builder">Attributes are not the same as properties, and fiore keeps them apart. <code>attrs(map)</code> calls
<code>setAttribute</code>, which suits names such as <code>aria-label</code> and <code>data-id</code>, and every
attribute of an SVG element.</p>
<p data-syntax="jsx">Attributes are not the same as properties, and fiore keeps them apart. In JSX a name that is all
lower case or has a dash, such as <code>href</code>, <code>class</code>, <code>aria-label</code> and
<code>data-id</code>, is set with <code>setAttribute</code>. So is every prop of an SVG element.</p>
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
        jsx: {
          code: `document.body.append(<a href="https://example.com">Example</a>);
`,
          solution: `document.body.append(
  <a href="https://example.com" target="_blank" data-id="42">
    Example
  </a>,
);
`,
        },
      },
      {
        slug: 'events',
        title: 'Events',
        body: `
<p data-syntax="builder"><code>on(map)</code> adds event listeners. The key is the event name and the value is a function that gets the
event. To pass options, give an object with <code>handler</code> and <code>options</code>. Listeners added by several
calls to <code>on</code> never replace each other.</p>
<pre data-syntax="builder"><code class="language-js">button.on({ click: (event) => console.log(event.currentTarget) }).create('Log')</code></pre>
<p data-syntax="jsx">A prop that starts with <code>on</code> adds an event listener: <code>onclick</code> and
<code>onClick</code> both listen to <code>click</code>. The first letter of the event name is lowercased and the rest is
kept, so <code>onvalueChanged</code> listens to <code>valueChanged</code>. The value is a function that gets the event.
To pass options, give an object with <code>handler</code> and <code>options</code>.</p>
<pre data-syntax="jsx"><code class="language-jsx">&lt;button onclick={(event) =&gt; console.log(event.currentTarget)}&gt;Log&lt;/button&gt;</code></pre>
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
        jsx: {
          code: `document.body.append(<button>Click me</button>);
`,
          solution: `document.body.append(
  <button
    onclick={(event) => {
      event.currentTarget.textContent = 'Clicked';
    }}
  >
    Click me
  </button>,
);
`,
        },
      },
      {
        slug: 'plain-calls',
        title: 'Plain calls and the data object',
        body: `
<div data-syntax="builder">
<p>A tag can also be called directly. A plain object is read as the data object, whose keys are <code>props</code>,
<code>attrs</code>, <code>on</code> and <code>children</code>. Anything else is the children. So
<code>p('Hello')</code> is short for <code>p.create('Hello')</code>.</p>
<pre><code class="language-js">p({ props: { className: 'lead' }, children: 'Hello' })</code></pre>
<p>Because a plain object is the data object, text that comes from outside, such as parsed JSON, goes through
<code>create(value)</code>.</p>
<p>Rewrite the call with the data object: add a <code>className</code> prop of <code>'lead'</code> and a
<code>title</code> attribute.</p>
</div>
<div data-syntax="jsx">
<p>The data object has no counterpart in JSX, and it needs none: a JSX tag already takes its props, attributes,
listeners and children in one place. A value inside braces is always a child, never a data object, so text that
comes from outside is safe to write as <code>{text}</code>.</p>
<pre><code class="language-jsx">&lt;p className="lead" title="Intro"&gt;Hello&lt;/p&gt;</code></pre>
<p>Add a <code>className</code> of <code>'lead'</code> and a <code>title</code> attribute to the paragraph.</p>
</div>`,
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
        jsx: {
          code: `document.body.append(<p>Plain calls are short.</p>);
`,
          solution: `document.body.append(
  <p className="lead" title="Intro">
    Plain calls are short.
  </p>,
);
`,
        },
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
<div data-syntax="builder">
<p>Each builder method returns a new builder and leaves the old one unchanged. A builder is therefore a template:
keep the common settings in a constant and create as many elements from it as you like.</p>
<pre><code class="language-js">const card = div.props({ className: 'card' });
card.attrs({ title: 'Special' }).create('B');</code></pre>
<p>The code below creates two cards. Create a third card from <code>card</code> that has a <code>title</code>
attribute of <code>'Special'</code>, without changing <code>card</code> itself.</p>
</div>
<div data-syntax="jsx">
<p>JSX has no builders. The closest idea is a component: a function that takes a props object and returns an
element. Keep the common settings inside it and spread the props it receives, so every card can add its own.</p>
<pre><code class="language-jsx">function Card(props) {
  return &lt;div className="card" {...props} /&gt;;
}
&lt;Card title="Special"&gt;B&lt;/Card&gt;</code></pre>
<p>The code below creates two cards. Create a third <code>Card</code> that has a <code>title</code> attribute of
<code>'Special'</code>, without changing the component itself.</p>
</div>`,
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
        jsx: {
          code: `function Card(props) {
  return <div className="card" style={{ border: '1px solid #999', padding: '8px' }} {...props} />;
}

document.body.append(<Card>First</Card>, <Card>Second</Card>);
`,
          solution: `function Card(props) {
  return <div className="card" style={{ border: '1px solid #999', padding: '8px' }} {...props} />;
}

document.body.append(
  <Card>First</Card>,
  <Card>Second</Card>,
  <Card title="Special">Third</Card>,
);
`,
        },
      },
      {
        slug: 'with',
        title: 'Reusable modifiers with with()',
        body: `
<div data-syntax="builder">
<p><code>with(fn)</code> calls <code>fn</code> with the builder and uses the builder it returns. A function that
takes a builder and returns one is a modifier, and modifiers can be shared between tags and combined.</p>
<pre><code class="language-js">const rounded = (b) => b.props({ style: { borderRadius: '8px' } });
div.with(rounded).create('Hi');</code></pre>
<p>Props combine key by key, and a later key wins. Two modifiers that both set <code>style</code> therefore do not
merge: the second <code>style</code> object replaces the first. Give each modifier its own keys.</p>
<p>Write a modifier <code>labelled</code> that sets the <code>aria-label</code> attribute to <code>'Notice'</code>, and
apply it to the <code>div</code> after <code>rounded</code>.</p>
</div>
<div data-syntax="jsx">
<p>JSX has no <code>with()</code>. The closest idea is a props object that you share and spread into the tags that
need it, and several objects can be combined.</p>
<pre><code class="language-jsx">const rounded = { style: { borderRadius: '8px' } };
&lt;div {...rounded}&gt;Hi&lt;/div&gt;</code></pre>
<p>Spreads combine key by key, and a later key wins. Two objects that both set <code>style</code> therefore do not
merge: the second <code>style</code> replaces the first. Give each object its own keys.</p>
<p>Write a props object <code>labelled</code> that sets the <code>aria-label</code> attribute to
<code>'Notice'</code>, and spread it into the <code>div</code> after <code>rounded</code>.</p>
</div>`,
        code: `import { div } from 'fiorejs';

const rounded = (b) => b.props({ style: { borderRadius: '8px', border: '1px solid #999', padding: '16px' } });

document.body.append(div.with(rounded).create('A rounded box'));
`,
        solution: `import { div } from 'fiorejs';

const rounded = (b) => b.props({ style: { borderRadius: '8px', border: '1px solid #999', padding: '16px' } });
const labelled = (b) => b.attrs({ 'aria-label': 'Notice' });

document.body.append(div.with(rounded).with(labelled).create('A rounded box'));
`,
        jsx: {
          code: `const rounded = { style: { borderRadius: '8px', border: '1px solid #999', padding: '16px' } };

document.body.append(<div {...rounded}>A rounded box</div>);
`,
          solution: `const rounded = { style: { borderRadius: '8px', border: '1px solid #999', padding: '16px' } };
const labelled = { 'aria-label': 'Notice' };

document.body.append(
  <div {...rounded} {...labelled}>
    A rounded box
  </div>,
);
`,
        },
      },
      {
        slug: 'also',
        title: 'Reaching the element with also()',
        body: `
<div data-syntax="builder">
<p><code>also(fn)</code> calls <code>fn</code> with the created element, after the props, attributes, children and
listeners are applied. Use it to keep a reference to the element. The element is not in the document yet while
<code>fn</code> runs, so focusing or measuring does not work there; do that after you append it.</p>
<pre><code class="language-js">let field;
input.also((element) => (field = element)).create();</code></pre>
<p>Store the input in a variable with <code>also</code>, then focus it after it is appended.</p>
</div>
<div data-syntax="jsx">
<p>JSX has no <code>also()</code>. Its equivalent is <code>ref</code>, a function that is called with the finished element,
after its props, listeners and children are applied. The element is not in the document yet, so focusing or measuring
works only after you append it. In TypeScript <code>ref</code> is typed by the tag.</p>
<pre><code class="language-jsx">let field;
&lt;input ref={(element) =&gt; (field = element)} /&gt;;</code></pre>
<p>Store the input in a variable with <code>ref</code>, then focus it after it is appended.</p>
</div>`,
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
        jsx: {
          code: `document.body.append(<input placeholder="Type here" />);
`,
          solution: `let field;

document.body.append(<input placeholder="Type here" ref={(element) => (field = element)} />);

field.focus();
`,
        },
      },
      {
        slug: 'fragments',
        title: 'Fragments',
        body: `
<p data-syntax="builder"><code>fragment(children)</code> returns a <code>DocumentFragment</code>: a group of nodes without a wrapping
element. It takes the same children as a tag. It is useful where a wrapper is not allowed, such as the term and the
description inside a <code>dl</code>.</p>
<pre data-syntax="builder"><code class="language-js">fragment([dt('Name'), dd('fiore')])</code></pre>
<p data-syntax="jsx"><code>&lt;&gt;...&lt;/&gt;</code> returns a <code>DocumentFragment</code>: a group of nodes without a
wrapping element. It is useful where a wrapper is not allowed, such as the term and the description inside a
<code>dl</code>.</p>
<pre data-syntax="jsx"><code class="language-jsx">&lt;&gt;
  &lt;dt&gt;Name&lt;/dt&gt;
  &lt;dd&gt;fiore&lt;/dd&gt;
&lt;/&gt;</code></pre>
<p data-syntax="builder">The code wraps each pair in a <code>div</code>. Replace the <code>div</code> with <code>fragment</code> so the
<code>dt</code> and <code>dd</code> elements sit directly in the list.</p>
<p data-syntax="jsx">The code wraps each pair in a <code>div</code>. Replace the <code>div</code> with a fragment so the
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
        jsx: {
          code: `const terms = [
  { name: 'Props', text: 'JavaScript properties' },
  { name: 'Attrs', text: 'Attributes' },
];

document.body.append(
  <dl>
    {terms.map((term) => (
      <div>
        <dt>{term.name}</dt>
        <dd>{term.text}</dd>
      </div>
    ))}
  </dl>,
);
`,
          solution: `const terms = [
  { name: 'Props', text: 'JavaScript properties' },
  { name: 'Attrs', text: 'Attributes' },
];

document.body.append(
  <dl>
    {terms.map((term) => (
      <>
        <dt>{term.name}</dt>
        <dd>{term.text}</dd>
      </>
    ))}
  </dl>,
);
`,
        },
      },
      {
        slug: 'element-by-name',
        title: 'Elements by name',
        body: `
<div data-syntax="builder">
<p>Every tag is also available by name: <code>element(name)</code> returns a tag function with the same builder
methods. This helps when the tag name is data, or when the element is a custom one such as
<code>x-note</code>.</p>
<pre><code class="language-js">element('x-note').create('Hello')</code></pre>
<p>Add <code>'h3'</code> to the list of names, and give every heading a <code>title</code> attribute equal to its
name.</p>
</div>
<div data-syntax="jsx">
<p>A JSX tag name is fixed where you write it. A custom element such as <code>x-note</code> is written like any
other tag. When the tag name is data, put it in a variable whose name starts with a capital letter and use the
variable as the tag.</p>
<pre><code class="language-jsx">&lt;x-note&gt;Hello&lt;/x-note&gt;

const Tag = 'h1';
&lt;Tag&gt;Hello&lt;/Tag&gt;</code></pre>
<p>Add <code>'h3'</code> to the list of names, and give every heading a <code>title</code> attribute equal to its
name.</p>
</div>`,
        code: `import { element } from 'fiorejs';

const names = ['h1', 'h2'];

document.body.append(...names.map((name) => element(name).create(name)));
`,
        solution: `import { element } from 'fiorejs';

const names = ['h1', 'h2', 'h3'];

document.body.append(...names.map((name) => element(name).attrs({ title: name }).create(name)));
`,
        jsx: {
          code: `const names = ['h1', 'h2'];

document.body.append(
  ...names.map((name) => {
    const Tag = name;
    return <Tag>{name}</Tag>;
  }),
);
`,
          solution: `const names = ['h1', 'h2', 'h3'];

document.body.append(
  ...names.map((name) => {
    const Tag = name;
    return <Tag title={name}>{name}</Tag>;
  }),
);
`,
        },
      },
      {
        slug: 'svg',
        title: 'SVG',
        body: `
<p data-syntax="builder">SVG elements live in their own namespace, so they come from <code>fiorejs/svg</code>. The functions work the
same way. Most SVG properties are read-only objects, so set SVG settings with <code>attrs</code>.</p>
<pre data-syntax="builder"><code class="language-js">import { svg, circle } from 'fiorejs/svg';</code></pre>
<p data-syntax="jsx">SVG elements live in their own namespace, and JSX creates them in it for you: inside
<code>&lt;svg&gt;</code>, tags such as <code>circle</code> and <code>rect</code> are SVG elements, and every prop is
set as an attribute. There is nothing to import. Only <code>a</code>, <code>script</code>, <code>style</code> and
<code>title</code> always create HTML elements.</p>
<pre data-syntax="jsx"><code class="language-jsx">&lt;svg viewBox="0 0 100 100"&gt;&lt;circle r="20" /&gt;&lt;/svg&gt;</code></pre>
<p>Add a <code>rect</code> to the drawing, 40 wide and 20 high, at <code>x</code> 10 and <code>y</code> 60, with a
<code>fill</code> of <code>'steelblue'</code>.</p>`,
        code: `import { circle, svg } from 'fiorejs/svg';

document.body.append(
  svg.attrs({ width: '100', height: '100', viewBox: '0 0 100 100' }).create([
    circle.attrs({ cx: '50', cy: '30', r: '20', fill: 'tomato' }).create(),
  ]),
);
`,
        solution: `import { circle, rect, svg } from 'fiorejs/svg';

document.body.append(
  svg.attrs({ width: '100', height: '100', viewBox: '0 0 100 100' }).create([
    circle.attrs({ cx: '50', cy: '30', r: '20', fill: 'tomato' }).create(),
    rect.attrs({ x: '10', y: '60', width: '40', height: '20', fill: 'steelblue' }).create(),
  ]),
);
`,
        jsx: {
          code: `document.body.append(
  <svg width="100" height="100" viewBox="0 0 100 100">
    <circle cx="50" cy="30" r="20" fill="tomato" />
  </svg>,
);
`,
          solution: `document.body.append(
  <svg width="100" height="100" viewBox="0 0 100 100">
    <circle cx="50" cy="30" r="20" fill="tomato" />
    <rect x="10" y="60" width="40" height="20" fill="steelblue" />
  </svg>,
);
`,
        },
      },
      {
        slug: 'mathml',
        title: 'MathML',
        body: `
<p>MathML works the same way, from <code>fiorejs/math</code>. <code>math</code> is the root, and
<code>mi</code>, <code>mn</code> and <code>mo</code> are identifiers, numbers and operators. Layout elements such as
<code>msup</code> (a superscript) and <code>mfrac</code> (a fraction) take their parts as children.</p>
<pre data-syntax="builder"><code class="language-js">msup.create([mi('x'), mn('2')])</code></pre>
<p data-syntax="jsx">JSX has no MathML tags: <code>&lt;math&gt;</code> and <code>&lt;mi&gt;</code> would create HTML
elements. In a JSX file, use the functions from <code>fiorejs/math</code> as in the builder syntax; the result is a
node that you can append or place inside a JSX element as a child.</p>
<pre data-syntax="jsx"><code class="language-js">msup.create([mi('x'), mn('2')])</code></pre>
<p>Write the formula as <em>x squared</em> by wrapping <code>mi('x')</code> and <code>mn('2')</code> in an
<code>msup</code>.</p>`,
        code: `import { math, mi, mn } from 'fiorejs/math';

document.body.append(math.create([mi('x'), mn('2')]));
`,
        solution: `import { math, mi, mn, msup } from 'fiorejs/math';

document.body.append(math.create(msup.create([mi('x'), mn('2')])));
`,
        jsx: {
          code: `import { math, mi, mn } from 'fiorejs/math';

document.body.append(math.create([mi('x'), mn('2')]));
`,
          solution: `import { math, mi, mn, msup } from 'fiorejs/math';

document.body.append(math.create(msup.create([mi('x'), mn('2')])));
`,
        },
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
<pre data-syntax="builder"><code class="language-js">span(count) // follows count
span(count.get()) // shows the value once</code></pre>
<pre data-syntax="jsx"><code class="language-jsx">&lt;span&gt;{count}&lt;/span&gt; {/* follows count */}
&lt;span&gt;{count.get()}&lt;/span&gt; {/* shows the value once */}</code></pre>
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
        jsx: {
          code: `import { state } from '@fiorejs/signals';

const count = state(0);

document.body.append(
  <p>Count: {count.get()}</p>,
  <button onclick={() => count.set(count.get() + 1)}>Add one</button>,
);
`,
          solution: `import { state } from '@fiorejs/signals';

const count = state(0);

document.body.append(
  <p>Count: {count}</p>,
  <button onclick={() => count.set(count.get() + 1)}>Add one</button>,
);
`,
        },
      },
      {
        slug: 'computed',
        title: 'Derived values',
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
        jsx: {
          code: `import { state } from '@fiorejs/signals';

const count = state(1);

document.body.append(
  <p>Count: {count}</p>,
  <button onclick={() => count.set(count.get() + 1)}>Add one</button>,
);
`,
          solution: `import { computed, state } from '@fiorejs/signals';

const count = state(1);
const double = computed(() => count.get() * 2);

document.body.append(
  <p>Count: {count}</p>,
  <p>Double: {double}</p>,
  <p>{count.computed((n) => (n % 2 === 0 ? 'even' : 'odd'))}</p>,
  <button onclick={() => count.set(count.get() + 1)}>Add one</button>,
);
`,
        },
      },
      {
        slug: 'update-mutate',
        title: 'Update and mutate',
        body: `
<p><code>update(fn)</code> sets the value that <code>fn</code> returns from the current one, so you do not read the
value yourself. A signal tracks its value, not what is inside it: an array you change in place looks unchanged.</p>
<p>The normal way is to replace the value with a copy: <code>items.update((list) =&gt; [...list, 'x'])</code>.
<code>mutate(fn)</code> changes the value in place and still notifies. It is meant for very large values, where
copying on every change costs too much.</p>
<pre><code class="language-js">count.update((n) => n + 1);
items.mutate((list) => list.push('x'));</code></pre>
<p>Change the first button to use <code>update</code>. The list here is small, so copying is fine, but change the
second button to <code>mutate</code> once to see how it works.</p>`,
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
        jsx: {
          code: `import { state } from '@fiorejs/signals';

const count = state(0);
const items = state(['a']);

document.body.append(
  <p>Count: {count}</p>,
  <p>Items: {items.computed((list) => list.join(', '))}</p>,
  <button onclick={() => count.set(count.get() + 1)}>Add one</button>,
  <button onclick={() => items.set([...items.get(), 'x'])}>Add item</button>,
);
`,
          solution: `import { state } from '@fiorejs/signals';

const count = state(0);
const items = state(['a']);

document.body.append(
  <p>Count: {count}</p>,
  <p>Items: {items.computed((list) => list.join(', '))}</p>,
  <button onclick={() => count.update((n) => n + 1)}>Add one</button>,
  <button onclick={() => items.mutate((list) => list.push('x'))}>Add item</button>,
);
`,
        },
      },
      {
        slug: 'bindings',
        title: 'Binding to the DOM',
        body: `
<p data-syntax="builder">A signal also binds to a prop or an attribute: <code>input.props({ value: name })</code> or
<code>div.attrs({ title: name })</code>. The element is updated whenever the signal changes. It works inside nested
props too, such as <code>style: { color: someSignal }</code>.</p>
<p data-syntax="jsx">A signal also binds to a prop: <code>&lt;input value={name} /&gt;</code> or
<code>&lt;div title={name} /&gt;</code>. The element is updated whenever the signal changes. It works inside a
<code>style</code> object too, such as <code>style={{ color: someSignal }}</code>. A function is never live, so a
derived value is <code>class={computed(() =&gt; ...)}</code>, not <code>class={() =&gt; ...}</code>.</p>
<p>The binding goes one way, from the signal to the element, so keep a listener that writes the typed text back.</p>
<p data-syntax="builder">The input below writes into <code>name</code> but does not follow it, so the Reset button leaves the text in
place. Bind the input's <code>value</code> prop to <code>name</code>.</p>
<p data-syntax="jsx">The input below writes into <code>name</code> but does not follow it, so the Reset button leaves the text in
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
        jsx: {
          code: `import { state } from '@fiorejs/signals';

const name = state('fiore');

document.body.append(
  <input oninput={(event) => name.set(event.currentTarget.value)} />,
  <button onclick={() => name.set('')}>Reset</button>,
  <p>Hello {name}</p>,
);
`,
          solution: `import { state } from '@fiorejs/signals';

const name = state('fiore');

document.body.append(
  <input value={name} oninput={(event) => name.set(event.currentTarget.value)} />,
  <button onclick={() => name.set('')}>Reset</button>,
  <p>Hello {name}</p>,
);
`,
        },
      },
      {
        slug: 'class-list',
        title: 'Classes with classList',
        body: `
<p><code>classList(entries)</code> builds the text of <code>className</code> or the <code>class</code> attribute.
Strings are always on. In an object, a key is on while its value is truthy, and the value can be a boolean, a
signal or a getter function.</p>
<pre><code class="language-js">classList(['card', { active, hidden: () => !visible.get() }])</code></pre>
<p data-syntax="builder">Replace the fixed class name with a <code>classList</code> that keeps <code>'card'</code> and adds
<code>'active'</code> while the <code>active</code> signal is true.</p>
<p data-syntax="jsx">Replace the fixed class with a <code>classList</code> that keeps <code>'card'</code> and adds
<code>'active'</code> while the <code>active</code> signal is true. It goes in the <code>class</code> prop like any
other live value.</p>`,
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
        jsx: {
          code: `import { state } from '@fiorejs/signals';

const active = state(false);

document.head.append(<style>{'.active { background: gold; }'}</style>);

document.body.append(
  <div className="card">A card</div>,
  <button onclick={() => active.update((on) => !on)}>Toggle</button>,
);
`,
          solution: `import { classList, state } from '@fiorejs/signals';

const active = state(false);

document.head.append(<style>{'.active { background: gold; }'}</style>);

document.body.append(
  <div className={classList(['card', { active }])}>A card</div>,
  <button onclick={() => active.update((on) => !on)}>Toggle</button>,
);
`,
        },
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
        jsx: {
          code: `import { state } from '@fiorejs/signals';

const count = state(0);

document.body.append(
  <p>Count: {count}</p>,
  <button onclick={() => count.update((n) => n + 1)}>Add one</button>,
);
`,
          solution: `import { effect, state } from '@fiorejs/signals';

const count = state(0);

effect(() => {
  document.title = 'Count: ' + count.get();
});

document.body.append(
  <p>Count: {count}</p>,
  <button onclick={() => count.update((n) => n + 1)}>Add one</button>,
);
`,
        },
      },
      {
        slug: 'untrack',
        title: 'Reading without subscribing',
        body: `
<p>Reading a signal inside an effect, a computed or a binding subscribes to it. Sometimes you only want the
current value. <code>untrack(fn)</code> runs <code>fn</code> without subscribing to the signals it reads. It keeps the
current owner, so what it creates still stops with it.</p>
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
        jsx: {
          code: `import { effect, state } from '@fiorejs/signals';

const query = state('a');
const page = state(1);

effect(() => console.log('search', query.get(), 'page', page.get()));

document.body.append(
  <button onclick={() => query.update((q) => q + 'a')}>Change query</button>,
  <button onclick={() => page.update((n) => n + 1)}>Next page</button>,
);
`,
          solution: `import { effect, state, untrack } from '@fiorejs/signals';

const query = state('a');
const page = state(1);

effect(() => console.log('search', query.get(), 'page', untrack(() => page.get())));

document.body.append(
  <button onclick={() => query.update((q) => q + 'a')}>Change query</button>,
  <button onclick={() => page.update((n) => n + 1)}>Next page</button>,
);
`,
        },
      },
      {
        slug: 'timing',
        title: 'Timing and batching',
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
        jsx: {
          code: `import { state } from '@fiorejs/signals';

const count = state(0);
const view = <p>{count}</p>;
document.body.append(view);

count.set(1);
console.log('text:', view.textContent);
`,
          solution: `import { flush, state, tick } from '@fiorejs/signals';

const count = state(0);
const view = <p>{count}</p>;
document.body.append(view);

count.set(1);
flush();
console.log('text:', view.textContent);

count.set(2);
await tick();
console.log('text:', view.textContent);
`,
        },
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
<pre data-syntax="builder"><code class="language-js">ul(fruits.map((fruit) => li(fruit)))</code></pre>
<pre data-syntax="jsx"><code class="language-jsx">&lt;ul&gt;{fruits.map((fruit) =&gt; &lt;li&gt;{fruit}&lt;/li&gt;)}&lt;/ul&gt;</code></pre>
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
        jsx: {
          code: `import { state } from '@fiorejs/signals';

const fruits = state(['apple', 'pear']);

document.body.append(
  <ul>{fruits.get().map((fruit) => <li>{fruit}</li>)}</ul>,
  <button onclick={() => fruits.update((list) => [...list, 'plum'])}>Add plum</button>,
);
`,
          solution: `import { state } from '@fiorejs/signals';

const fruits = state(['apple', 'pear']);

document.body.append(
  <ul>{fruits.map((fruit) => <li>{fruit}</li>)}</ul>,
  <button onclick={() => fruits.update((list) => [...list, 'plum'])}>Add plum</button>,
);
`,
        },
      },
      {
        slug: 'keyed-lists',
        title: 'Keyed lists',
        body: `
<p>With <code>map</code>, the item itself is the key, so an item replaced by a copy gets a new row.
<code>signal.for(key).map(render)</code> keys the rows by what <code>key</code> returns, for example an id. In a keyed
list <code>render</code> gets the item as a read-only signal: read it with <code>todo.get()</code>, or bind a field
with <code>todo.computed(...)</code>. When a new array keeps the key with another object, the row stays and only the
bindings that read the signal update.</p>
<pre data-syntax="builder"><code class="language-js">todos.for((todo) => todo.id).map((todo) => li(todo.computed((item) => item.text)))</code></pre>
<pre data-syntax="jsx"><code class="language-jsx">todos.for((todo) =&gt; todo.id).map((todo) =&gt; &lt;li&gt;{todo.computed((item) =&gt; item.text)}&lt;/li&gt;)</code></pre>
<p data-syntax="jsx">The <code>key</code> prop of JSX is ignored, because nothing is diffed. Keyed rows come from
<code>for</code> in <code>@fiorejs/signals</code>.</p>
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
      console.log('render row', todo.get().id);
      return li(todo.computed((item) => item.text));
    }),
  ),
  button
    .on({ click: () => todos.update((list) => list.map((todo) => ({ ...todo })).concat({ id: next++, text: 'Item' })) })
    .create('Add'),
);
`,
        jsx: {
          code: `import { state } from '@fiorejs/signals';

const todos = state([{ id: 1, text: 'Write docs' }]);
let next = 2;

document.body.append(
  <ul>
    {todos.map((todo) => {
      console.log('render row', todo.id);
      return <li>{todo.text}</li>;
    })}
  </ul>,
  <button
    onclick={() => todos.update((list) => list.map((todo) => ({ ...todo })).concat({ id: next++, text: 'Item' }))}
  >
    Add
  </button>,
);
`,
          solution: `import { state } from '@fiorejs/signals';

const todos = state([{ id: 1, text: 'Write docs' }]);
let next = 2;

document.body.append(
  <ul>
    {todos.for((todo) => todo.id).map((todo) => {
      console.log('render row', todo.get().id);
      return <li>{todo.computed((item) => item.text)}</li>;
    })}
  </ul>,
  <button
    onclick={() => todos.update((list) => list.map((todo) => ({ ...todo })).concat({ id: next++, text: 'Item' }))}
  >
    Add
  </button>,
);
`,
        },
      },
      {
        slug: 'conditions',
        title: 'Conditional rendering',
        body: `
<p>A component runs once, so <code>open.get() ? a : b</code> is read once and never switches.
<code>signal.if(then)</code> is the live version: it shows what <code>then</code> returns for the value while it is
truthy, and <code>.else(otherwise)</code> adds the other branch. Both are functions, so only the shown branch is
built. <code>then</code> gets the value and is built again whenever the value changes; to build it only when the
truthiness flips, use <code>signal.computed(Boolean).if(...)</code>.</p>
<pre data-syntax="builder"><code class="language-js">div(open.if(() => p('Details')).else(() => em('closed')))</code></pre>
<pre data-syntax="jsx"><code class="language-jsx">&lt;div&gt;{open.if(() =&gt; &lt;p&gt;Details&lt;/p&gt;).else(() =&gt; &lt;em&gt;closed&lt;/em&gt;)}&lt;/div&gt;</code></pre>
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
        jsx: {
          code: `import { state } from '@fiorejs/signals';

const open = state(false);

document.body.append(
  <button onclick={() => open.update((value) => !value)}>Toggle</button>,
  <div>{open.get() ? <p>Some details</p> : <em>closed</em>}</div>,
);
`,
          solution: `import { state } from '@fiorejs/signals';

const open = state(false);

document.body.append(
  <button onclick={() => open.update((value) => !value)}>Toggle</button>,
  <div>{open.if(() => <p>Some details</p>).else(() => <em>closed</em>)}</div>,
);
`,
        },
      },
      {
        slug: 'case',
        title: 'Several branches with case',
        body: `
<p><code>signal.case(match, render)</code> shows what <code>render</code> returns while the value matches. A
function is a test on the value, and any other value is compared with <code>Object.is</code>. Chain more cases;
the first match wins. <code>.else(otherwise)</code> covers the rest. <code>render</code> gets the value, and the branch
is built again when the value changes.</p>
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
        jsx: {
          code: `import { state } from '@fiorejs/signals';

const status = state('loading');

document.body.append(
  <div>{status.case('loading', () => 'Loading').else(() => 'Unknown')}</div>,
  <button onclick={() => status.set('done')}>Finish</button>,
  <button onclick={() => status.set('error')}>Fail</button>,
);
`,
          solution: `import { state } from '@fiorejs/signals';

const status = state('loading');

document.body.append(
  <div>
    {status
      .case('loading', () => 'Loading')
      .case('error', () => 'Something went wrong')
      .case('done', () => 'Finished')
      .else(() => 'Unknown')}
  </div>,
  <button onclick={() => status.set('done')}>Finish</button>,
  <button onclick={() => status.set('error')}>Fail</button>,
);
`,
        },
      },
      {
        slug: 'resource',
        title: 'Async data',
        body: `
<p><code>resource(source, fetcher)</code> calls <code>fetcher</code> with the value of <code>source</code>, and loads
again when <code>source</code> changes. The resource is a signal of the last loaded value. Its <code>loading</code>
and <code>error</code> are signals too. The fetcher may return a promise. Like a state, a resource has <code>set</code>,
<code>update</code> and <code>mutate(fn)</code> to change the value without loading.</p>
<pre><code class="language-js">const user = resource(userId, (id) => loadUser(id));
user.loading.get(); // true while loading</code></pre>
<p>The fake <code>loadUser</code> answers after a short delay. Show <code>'Loading…'</code> while
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
  p(computed(() => (user.loading.get() ? 'Loading…' : user.get().name))),
  button.on({ click: () => userId.update((id) => id + 1) }).create('Next user'),
);
`,
        jsx: {
          code: `import { computed, resource, state } from '@fiorejs/signals';

const loadUser = (id) => new Promise((resolve) => setTimeout(() => resolve({ name: 'User ' + id }), 20));

const userId = state(1);
const user = resource(userId, (id) => loadUser(id));

document.body.append(
  <p>{computed(() => JSON.stringify(user.get()))}</p>,
  <button onclick={() => userId.update((id) => id + 1)}>Next user</button>,
);
`,
          solution: `import { computed, resource, state } from '@fiorejs/signals';

const loadUser = (id) => new Promise((resolve) => setTimeout(() => resolve({ name: 'User ' + id }), 20));

const userId = state(1);
const user = resource(userId, (id) => loadUser(id));

document.body.append(
  <p>{computed(() => (user.loading.get() ? 'Loading…' : user.get().name))}</p>,
  <button onclick={() => userId.update((id) => id + 1)}>Next user</button>,
);
`,
        },
      },
    ],
  },
  {
    title: 'Structure',
    lessons: [
      {
        slug: 'components',
        title: 'Components and state',
        body: `
<p>A component is a function that takes a props object and returns an element. It runs once and builds its
elements once, so pass it signals, not their current values. <code>Reactive&lt;T&gt;</code> in the types means a
plain value or a signal, and <code>read(value)</code> unwraps either.</p>
<pre data-syntax="builder"><code class="language-js">function Price(props) {
  return span(computed(() => read(props.amount).toFixed(2)));
}

Price({ amount })</code></pre>
<pre data-syntax="jsx"><code class="language-jsx">function Price(props) {
  return &lt;span&gt;{computed(() =&gt; read(props.amount).toFixed(2))}&lt;/span&gt;;
}

&lt;Price amount={amount} /&gt;</code></pre>
<p data-syntax="builder">The two counters below repeat the same code. Extract a <code>Counter</code> function that takes a props object
with a <code>label</code>, creates its own state, and returns a <code>div</code> with the paragraph and the button.
Call it twice, as <code>Counter({ label: 'First' })</code> and <code>Counter({ label: 'Second' })</code>.</p>
<p data-syntax="jsx">The two counters below repeat the same code. Extract a <code>Counter</code> component that takes a
<code>label</code> prop, creates its own state, and returns a <code>div</code> with the paragraph and the button.
Use it twice, as <code>&lt;Counter label="First" /&gt;</code> and <code>&lt;Counter label="Second" /&gt;</code>.</p>`,
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

function Counter(props) {
  const count = state(0);
  return div([p([props.label + ': ', count]), button.on({ click: () => count.update((n) => n + 1) }).create('Add')]);
}

document.body.append(Counter({ label: 'First' }), Counter({ label: 'Second' }));
`,
        jsx: {
          code: `import { state } from '@fiorejs/signals';

const first = state(0);
const second = state(0);

document.body.append(
  <div>
    <p>First: {first}</p>
    <button onclick={() => first.update((n) => n + 1)}>Add</button>
  </div>,
  <div>
    <p>Second: {second}</p>
    <button onclick={() => second.update((n) => n + 1)}>Add</button>
  </div>,
);
`,
          solution: `import { state } from '@fiorejs/signals';

function Counter(props) {
  const count = state(0);
  return (
    <div>
      <p>
        {props.label}: {count}
      </p>
      <button onclick={() => count.update((n) => n + 1)}>Add</button>
    </div>
  );
}

document.body.append(<Counter label="First" />, <Counter label="Second" />);
`,
        },
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
        jsx: {
          code: `import { state } from '@fiorejs/signals';

function Badge() {
  const count = state(0);
  return <span>Clicks: {count}</span>;
}

function AddButton() {
  const count = state(0);
  return <button onclick={() => count.update((n) => n + 1)}>Click</button>;
}

document.body.append(<Badge />, <AddButton />);
`,
          solution: `import { state } from '@fiorejs/signals';

const count = state(0);

function Badge() {
  return <span>Clicks: {count}</span>;
}

function AddButton() {
  return <button onclick={() => count.update((n) => n + 1)}>Click</button>;
}

document.body.append(<Badge />, <AddButton />);
`,
        },
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
<p>Inside an effect, <code>onCleanup(fn)</code> does the same, also from a function the effect calls; the
<a href="../guide/cleanup.html#on-cleanup" target="_blank">cleanup guide</a> shows it in components.</p>
<p>A change reaches the effect on the next flush, so call <code>flush()</code> after <code>name.set('b')</code> to
run the effect, and its cleanup, right away.</p>
<p>Return a function from the effect that logs <code>'leaving'</code> and the name, call <code>flush()</code> after
the change, and call <code>stop()</code> at the end.</p>
<p data-syntax="jsx">This lesson creates no elements, so the code is the same in JSX.</p>`,
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
        jsx: {
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
      },
      {
        slug: 'root',
        title: 'Cleaning up with root',
        body: `
<p>Bindings and effects stop on their own when the content that created them is replaced. For the rest,
<code>root(fn)</code> runs <code>fn</code> with an owner of its own, and returns a function that stops everything
<code>fn</code> created: effects, bindings, computeds and lists. A root belongs to no other owner, so call its
function yourself. <code>onCleanup(fn)</code> inside the root runs <code>fn</code> when the root is stopped, which is
the place to undo what you set up yourself, such as a document listener.</p>
<pre><code class="language-js">const dispose = root(() => {
  document.body.append(App());
  onCleanup(() => console.log('stopped'));
});
dispose();</code></pre>
<p>Wrap the creation of the page in <code>root</code>, and call the function it returns after the first update, so
the effect stops logging. Inside the root, add <code>onCleanup</code> that logs <code>'stopped'</code>.</p>`,
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
import { effect, flush, onCleanup, root, state } from '@fiorejs/signals';

const count = state(0);

const dispose = root(() => {
  effect(() => console.log('count', count.get()));
  onCleanup(() => console.log('stopped'));
  document.body.append(p(count));
});

count.set(1);
flush();
dispose();
count.set(2);
flush();
`,
        jsx: {
          code: `import { effect, flush, state } from '@fiorejs/signals';

const count = state(0);

effect(() => console.log('count', count.get()));
document.body.append(<p>{count}</p>);

count.set(1);
flush();
count.set(2);
flush();
`,
          solution: `import { effect, flush, onCleanup, root, state } from '@fiorejs/signals';

const count = state(0);

const dispose = root(() => {
  effect(() => console.log('count', count.get()));
  onCleanup(() => console.log('stopped'));
  document.body.append(<p>{count}</p>);
});

count.set(1);
flush();
dispose();
count.set(2);
flush();
`,
        },
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
it in a paragraph as <code>'Remaining: '</code> followed by the number. Then, in a <code>div</code> above the list,
show a paragraph <code>'Nothing to do'</code> while the list is empty, with <code>if</code>.</p>`,
        code: `import { button, form, input, li, ul } from 'fiorejs';
import { state } from '@fiorejs/signals';

const todos = state([{ id: 1, text: 'Learn fiore', done: state(false) }]);
const text = state('');
let nextId = 2;

function renderTodo(todo) {
  const item = todo.get();
  return li([
    input
      .props({ type: 'checkbox', checked: item.done })
      .on({ change: (event) => item.done.set(event.currentTarget.checked) })
      .create(),
    ' ',
    item.text,
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
  ul(todos.for((todo) => todo.id).map(renderTodo)),
  button.props({ type: 'button' }).on({ click: clearDone }).create('Clear done'),
);
`,
        solution: `import { button, div, form, input, li, p, ul } from 'fiorejs';
import { computed, state } from '@fiorejs/signals';

const todos = state([{ id: 1, text: 'Learn fiore', done: state(false) }]);
const text = state('');
let nextId = 2;

const remaining = computed(() => todos.get().filter((todo) => !todo.done.get()).length);

function renderTodo(todo) {
  const item = todo.get();
  return li([
    input
      .props({ type: 'checkbox', checked: item.done })
      .on({ change: (event) => item.done.set(event.currentTarget.checked) })
      .create(),
    ' ',
    item.text,
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
  ul(todos.for((todo) => todo.id).map(renderTodo)),
  p(['Remaining: ', remaining]),
  button.props({ type: 'button' }).on({ click: clearDone }).create('Clear done'),
);
`,
        jsx: {
          code: `import { state } from '@fiorejs/signals';

const todos = state([{ id: 1, text: 'Learn fiore', done: state(false) }]);
const text = state('');
let nextId = 2;

function renderTodo(todo) {
  const item = todo.get();
  return (
    <li>
      <input type="checkbox" checked={item.done} onchange={(event) => item.done.set(event.currentTarget.checked)} /> {item.text}
    </li>
  );
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
  <form onsubmit={add}>
    <input value={text} placeholder="What needs doing?" oninput={(event) => text.set(event.currentTarget.value)} />
    <button type="submit">Add</button>
  </form>,
  <ul>{todos.for((todo) => todo.id).map(renderTodo)}</ul>,
  <button type="button" onclick={clearDone}>
    Clear done
  </button>,
);
`,
          solution: `import { computed, state } from '@fiorejs/signals';

const todos = state([{ id: 1, text: 'Learn fiore', done: state(false) }]);
const text = state('');
let nextId = 2;

const remaining = computed(() => todos.get().filter((todo) => !todo.done.get()).length);

function renderTodo(todo) {
  const item = todo.get();
  return (
    <li>
      <input type="checkbox" checked={item.done} onchange={(event) => item.done.set(event.currentTarget.checked)} /> {item.text}
    </li>
  );
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
  <form onsubmit={add}>
    <input value={text} placeholder="What needs doing?" oninput={(event) => text.set(event.currentTarget.value)} />
    <button type="submit">Add</button>
  </form>,
  <div>{todos.computed((list) => list.length === 0).if(() => <p>Nothing to do</p>)}</div>,
  <ul>{todos.for((todo) => todo.id).map(renderTodo)}</ul>,
  <p>Remaining: {remaining}</p>,
  <button type="button" onclick={clearDone}>
    Clear done
  </button>,
);
`,
        },
      },
    ],
  },
];
