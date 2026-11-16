import { a, button, div, em, input, li, span, strong, ul } from 'fiorejs';
import svg from 'fiorejs/svg';
import { action, card, domView, flow, logger } from '../debug.js';

export default function builders() {
  // 1. The three ways to call a tag.
  const plain = span('Plain call: a string is the children');
  const data = span({ props: { title: 'set as a property' }, attrs: { 'data-kind': 'data object' }, children: 'Data object: props, attrs, on, children' });
  const chained = span.props({ title: 'built with a chain' }).attrs({ 'data-kind': 'builder' }).create('Builder: props().attrs().on().create()');
  const callStage = div([plain, ' · ', data, ' · ', chained]);

  // 2. A builder is an immutable template; with() applies a reusable modifier.
  const pill = (builder) => builder.attrs({ style: 'padding:2px 8px;border:1px solid #ccc;border-radius:99px' });
  const base = button.with(pill);
  const templateStage = div([base.create('one'), ' ', base.attrs({ title: 'extra attribute only on this one' }).create('two'), ' ', base.create('three')]);

  // 3. Listeners: a function, or { handler, options }; also() runs with the created element.
  const events = logger();
  const clicker = button
    .on({ click: () => events.write('click (every time)') })
    .on({ click: { handler: () => events.write('click (once)'), options: { once: true } } })
    .also((element) => events.write(`also(): created <${element.localName}>, not in the document yet`))
    .create('Click me twice');

  // 4. Children: null, undefined, true and false are skipped; arrays are flattened at any depth.
  const isAdmin = false;
  const extras = ['x', ['y', ['z']]];
  const childrenStage = ul([li('always'), isAdmin && li('only for admins'), null, [li('nested'), [li('deeper'), extras.map((text) => li(text))]]]);

  // 5. Props versus attributes, and inline handler attributes that are never set.
  const field = input({ props: { value: 'typed value (property)' }, attrs: { 'aria-label': 'demo field', onclick: 'alert(1)' } });
  const link = a.attrs({ href: '#builders', title: 'attributes go to setAttribute' }).create('a link');

  // 6. SVG and MathML tags create elements in their namespace.
  const icon = svg.svg.attrs({ width: 40, height: 40, viewBox: '0 0 40 40' }).create([svg.circle.attrs({ cx: 20, cy: 20, r: 16, fill: '#b5532f' }).create()]);

  return flow('builders', 'Builders and tags', 'How elements are created: plain calls, data objects, builder chains, templates, listeners, children and namespaces. Open "DOM" to see the markup each card produced.', [
    card('Three ways to call a tag', callStage, [], null),
    card('A builder is a template', templateStage, [], null),
    card('Listeners and also()', clicker, [action('Clear log', () => events.clear())], events),
    card('Children: skipped values and nested arrays', childrenStage, [], { view: domView(childrenStage) }),
    card('Props, attributes and inline handlers', div([field, ' ', link]), [action('Show the onclick attribute', () => events.write(`onclick attribute: ${field.getAttribute('onclick')} (never set: inline handlers run text as script)`))], null),
    card('SVG namespace', div([icon, ' ', strong(icon.namespaceURI), ' ', em('(not HTML)')]), [], null),
  ]);
}
