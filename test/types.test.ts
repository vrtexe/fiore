// Type checks for consumers, compiled with tsc --noEmit by npm test.
import { a, button, div, element, form, input, section, span, type HTMLModifier } from '../lib/html.js';
import svg from '../lib/svg.js';
import type { Children } from '../lib/html.js';
import type { Children as SVGChildren } from '../lib/svg.js';
import type { Children as MathChildren } from '../lib/math.js';

const isAdmin = false as boolean;

div({ children: [isAdmin && span(), null, undefined, true, 'text', 1, document.createTextNode('x')] });
div({ children: isAdmin ? span() : null });
div('text');
div([span(), ' text']);
const rowText = ['a', 'b'];
div([span('title'), rowText.map((text) => span(text))]);
div({ children: [span('title'), [span('a'), [span('b'), null]]] });
div.create([span('title'), rowText.map((text) => span(text))]);
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

// A bigint renders as text, like a number.
void div(10n);
void div([1n, ' items']);

// Boolean attributes take '' as in HTML, besides true and false.
form.attrs({ novalidate: '' }).create();
input.attrs({ autofocus: '', required: true, disabled: false }).create();
// @ts-expect-error a boolean attribute takes true, false or ''
input.attrs({ required: 'yes' }).create();

// element() takes a custom element name; its tag builds an HTMLElement and takes any attribute.
const userCard: HTMLElement = element('user-card').attrs({ name: 'Ada', class: 'card' }).create('Ada');
void userCard;
// @ts-expect-error a name without a hyphen must be a known element
element('usercard');
// @ts-expect-error the global attributes keep their types on a custom element
element('user-card').attrs({ class: 42 });

// With exactOptionalPropertyTypes, props take undefined like attributes do; undefined props are skipped.
declare const maybeId: string | undefined;
declare const maybeMax: number | undefined;
div.attrs({ title: maybeId }).create();
div.props({ title: maybeId, className: maybeId }).create();
input.props({ maxLength: maybeMax }).create();
// @ts-expect-error a prop still takes only its own type
input.props({ maxLength: 'ten' }).create();

// dataset is a prop whose keys are merged into the element's data-* attributes.
div.props({ dataset: { id: '42', kind: 'demo' } }).create('x');
div({ props: { dataset: { id: undefined } } });
// @ts-expect-error dataset values are strings
div.props({ dataset: { id: 42 } }).create();

// Children is exported from every entry point, for components that pass children on.
const panel = (children: Children) => section(children);
panel([span('a'), 'b', null]);
const shapes: SVGChildren = [svg.circle()];
const formula: MathChildren = 'x';
void [shapes, formula];
// @ts-expect-error a plain object is not a child
panel({ text: 'a' });
