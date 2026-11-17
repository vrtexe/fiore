import { highlight } from './highlight.js';

// Shared script of the documentation pages: the side navigation, previous/next links and code highlighting.
// Pages live in docs/guide/; each has <nav data-nav>, <nav data-pager> and plain <pre><code class="language-js">.

const NAV = [
  {
    group: 'Getting started',
    pages: [
      ['quick-start', 'Quick start'],
      ['installation', 'Installation'],
      ['create-project', 'Create a project'],
    ],
  },
  {
    group: 'Core concepts',
    pages: [
      ['elements', 'Elements and tags'],
      ['builders', 'Builders'],
      ['props-attrs', 'Props and attributes'],
      ['children', 'Children'],
      ['events', 'Events'],
      ['fragments', 'Fragments'],
      ['svg-math', 'SVG and MathML'],
    ],
  },
  {
    group: 'Reactivity',
    pages: [
      ['signals', 'Signals'],
      ['computed', 'Derived values'],
      ['effects', 'Effects'],
      ['binding', 'Binding to the DOM'],
      ['lists', 'Lists'],
      ['conditions', 'Conditional rendering'],
      ['resources', 'Async data'],
      ['cleanup', 'Ownership and cleanup'],
      ['timing', 'Timing and batching'],
    ],
  },
  {
    group: 'Guides',
    pages: [
      ['components', 'Components and state'],
      ['forms', 'Forms'],
      ['styling', 'Styling'],
      ['jsx', 'JSX'],
      ['typescript', 'TypeScript'],
      ['security', 'Security'],
    ],
  },
  {
    group: 'Reference',
    pages: [
      ['../api.html', 'API reference'],
      ['../signals.html', 'Signals reference'],
    ],
  },
];

const href = (slug) => (slug.endsWith('.html') ? slug : `${slug}.html`);
const current = location.pathname.split('/').pop().replace(/\.html$/, '') || 'quick-start';
const flat = NAV.flatMap((group) => group.pages);

const side = document.querySelector('[data-nav]');
if (side) {
  for (const { group, pages } of NAV) {
    const title = document.createElement('p');
    title.className = 'nav-group';
    title.textContent = group;
    side.append(title);
    for (const [slug, label] of pages) {
      const link = document.createElement('a');
      link.href = href(slug);
      link.textContent = label;
      if (slug === current) {
        link.className = 'is-active';
        link.setAttribute('aria-current', 'page');
      }
      side.append(link);
    }
  }
}

const pager = document.querySelector('[data-pager]');
const index = flat.findIndex(([slug]) => slug === current);
if (pager && index >= 0) {
  const add = (entry, rel, label) => {
    if (!entry || entry[0].endsWith('.html')) return;
    const link = document.createElement('a');
    link.href = href(entry[0]);
    link.rel = rel;
    link.innerHTML = `<span>${label}</span>${entry[1]}`;
    pager.append(link);
  };
  add(flat[index - 1], 'prev', 'Previous');
  add(flat[index + 1], 'next', 'Next');
}

highlight();
