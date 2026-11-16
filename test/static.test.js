import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';

const { window } = new JSDOM();
Object.assign(globalThis, { document: window.document, Node: window.Node });

// No live value is used in this file, so every element takes the static path most users take.
const { div, element } = await import('../lib/html.js');

test('nested props, attributes, children and listeners work without live values', () => {
  let clicks = 0;
  const el = element('button')({
    props: { title: 'Save', style: { height: '10px' } },
    attrs: { 'aria-label': 'Save', tabindex: 0 },
    children: ['Save ', 1],
    on: { click: () => clicks++ },
  });
  el.click();

  assert.equal(el.title, 'Save');
  assert.equal(el.style.height, '10px');
  assert.equal(el.getAttribute('tabindex'), '0');
  assert.equal(el.textContent, 'Save 1');
  assert.equal(clicks, 1);
});

test('children skip false, true and null without live values', () => {
  assert.equal(div({ children: [false, 'a', null, true] }).innerHTML, 'a');
});

test('textContent is kept when there are no children', () => {
  assert.equal(div({ props: { textContent: 'hi' } }).textContent, 'hi');
});

test('JSON __proto__ keys do not pollute Object.prototype without live values', () => {
  div({ props: { dataset: JSON.parse('{"__proto__":{"__proto__":{"polluted":"yes"}}}') } });

  assert.equal({}.polluted, undefined);
});

test('a cyclic children array renders its other items instead of looping', () => {
  const items = ['hi'];
  items.push(items);

  assert.equal(div(items).textContent, 'hi');
});
