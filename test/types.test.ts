// Type checks for consumers, compiled with tsc --noEmit by npm test.
import { a, button, div, input, section, span, type HTMLModifier } from '../lib/html.js';
import svg from '../lib/svg.js';

const isAdmin = false as boolean;

div({ children: [isAdmin && span(), null, undefined, true, 'text', 1, document.createTextNode('x')] });
div({ children: isAdmin ? span() : null });
div('text');
div([span(), ' text']);
svg.circle({ attrs: { 'data-id': '1', r: 4 } });
// @ts-expect-error SVG attributes are typed per element
svg.circle({ attrs: { notAnAttribute: 1 } });

// The builder returns the exact element type, whatever the order of the calls.
const field: HTMLInputElement = input.attrs({ name: 'email' }).props({ type: 'email', required: true }).create();
const link: HTMLAnchorElement = a.props({ href: '/' }).on({ click: (event) => event.preventDefault() }).create('Home');
void field;
void link;

// A modifier typed once works on every HTML tag and keeps the tag's own type.
const card: HTMLModifier = (b) => b.props({ className: 'card' }).attrs({ role: 'region' });
const clickable =
  (handler: () => void): HTMLModifier =>
  (b) =>
    b.on({ click: handler });
const box: HTMLDivElement = div.with(card).with(clickable(() => {})).create('A');
const part: HTMLElement = section.with(card).create('B');
const action: HTMLButtonElement = button.with(card).props({ type: 'submit' }).create('Save');
void box;
void part;
void action;

// A template builder can be reused and extended.
const template = div.props({ className: 'card' });
template.create(span('a'));
template.attrs({ 'aria-label': 'B' }).create(span('b'));

// Inline conditions keep the builder type.
div.with((b) => (isAdmin ? b.attrs({ 'data-admin': '' }) : b)).create();

// also() gets the typed element.
input.also((element) => element.select()).create();

// @ts-expect-error props are typed per element
div.props({ href: '/' });
// @ts-expect-error listeners are typed per event
button.on({ click: (event: KeyboardEvent) => event.key });
// @ts-expect-error `create` returns the element of the tag
const wrong: HTMLInputElement = div.create();
void wrong;
// @ts-expect-error create takes one children value, an array for several
div.create('a', 'b');
