import { div, input, li, ul } from 'fiorejs';
import { classList, computed, each, read, resource, state, type Reactive } from '@fiorejs/signals';
// @ts-expect-error the brand is not exported
import { SIGNAL } from '@fiorejs/signals';
void SIGNAL;

const name = state('Ada');

input({ props: { value: name } });
div({
  attrs: { title: () => name.get() },
  children: [name, () => (name.get().length > 3 ? 'long' : 'short')],
});

// @ts-expect-error a number signal is not a string value
input({ props: { value: state(1) } });

function Label(props: { text: Reactive<string> }) {
  return div({ children: props.text });
}

Label({ text: 'static' });
Label({ text: name });
Label({ text: () => name.get().toUpperCase() });

name.update((value) => value.trim());
// @ts-expect-error update has to return the new value
name.update((value) => value.length);

const doubled: number = read(computed(() => 2));
void doubled;

ul({ children: each(state(['a', 'b']), (item) => li({ children: item })) });

const user = resource(name, async (value, { signal }) => ({ value, aborted: signal.aborted }));
const loaded: { value: string; aborted: boolean } | undefined = user.get();
const busy: boolean = user.loading.get();
void loaded;
void busy;
user.refetch();
user.mutate({ value: 'x', aborted: false });
div({ children: () => user.get()?.value ?? 'loading' });
const plain = resource(() => 42);
const answer: number | undefined = plain.get();
void answer;

div.props({ className: classList(['card', { active: name, disabled: () => false }]) }).create();
