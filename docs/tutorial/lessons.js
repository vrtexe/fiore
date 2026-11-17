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
    ],
  },
];
