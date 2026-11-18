// Type-only checks: JSX accepts live values for children, attributes and properties, and a bare getter is not one.
import { LIVE } from 'fiorejs';
import type { LiveValue } from 'fiorejs/type/base.dom.d.ts';
import { computed, state } from '@fiorejs/signals';

const live = <T,>(value: T): LiveValue<T> => ({ [LIVE]: (apply) => apply(value) });

const name = live('Ada');

void (<span>{name}</span>);
void (<ul>{live([<li>a</li>, <li>b</li>])}</ul>);
void (<input value={name} placeholder={live('Name')} class={live('field')} />);
void (<svg viewBox={live('0 0 10 10')} />);
// @ts-expect-error a live value must still have the right type
void (<input placeholder={live(42)} />);
void (<div style={{ color: live('tomato'), fontSize: live('16px'), margin: '0' }} />);
const color = state('tomato');
const size = state('16px');
void (<div style={{ color, fontSize: size }}>Styled</div>);
void (<div style={{ width: computed(() => '50%') }} />);
// @ts-expect-error a live style value must still have the right type
void (<div style={{ color: live(42) }} />);
// @ts-expect-error a getter is not a live value
void (<input placeholder={() => 'Name'} />);
// @ts-expect-error listeners are not live values
void (<button onclick={'not a function'} />);

export {};

// The package root exports the JSX namespace and Child, for components that forward props to an element.
import type { Child, JSX } from '@fiorejs/jsx';

function TextInput(props: JSX.IntrinsicElements['input']) {
  return <input {...props} />;
}
const label: Child = 'Email';
void (<label>{label}<TextInput type="email" /></label>);

// ref is typed by the tag: an input gives HTMLInputElement, and a wrong element type is rejected.
void (<input ref={(element: HTMLInputElement) => element.focus()} />);
// @ts-expect-error a div is not an input
void (<div ref={(element: HTMLInputElement) => element.focus()} />);
