import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';

const { window } = new JSDOM();
Object.assign(globalThis, { document: window.document, Node: window.Node });

// No plugin is registered in this file, so every element takes the fast path most users take.
const { div, element } = await import('../lib/html.js');

test('nested props, attributes, children and listeners work without plugins', () => {
  let clicks = 0;
  const el = element('button', {
    props: { title: 'Save', style: { height: '10px' } },
    attributes: { 'aria-label': 'Save', tabindex: 0 },
    children: ['Save ', 1],
    event: { click: () => clicks++ },
  });
  el.click();

  assert.equal(el.title, 'Save');
  assert.equal(el.style.height, '10px');
  assert.equal(el.getAttribute('tabindex'), '0');
  assert.equal(el.textContent, 'Save 1');
  assert.equal(clicks, 1);
});

test('children skip false, true and null without plugins', () => {
  assert.equal(div({ children: [false, 'a', null, true] }).innerHTML, 'a');
});

test('textContent is kept when there are no children', () => {
  assert.equal(div({ props: { textContent: 'hi' } }).textContent, 'hi');
});

test('a promise child is inserted once it resolves without plugins', async () => {
  const el = div({ children: ['a', Promise.resolve('b'), 'c'] });
  await new Promise((resolve) => setTimeout(resolve));

  assert.equal(el.textContent, 'abc');
});

test('JSON __proto__ keys do not pollute Object.prototype without plugins', () => {
  div({ props: { dataset: JSON.parse('{"__proto__":{"__proto__":{"polluted":"yes"}}}') } });

  assert.equal({}.polluted, undefined);
});
