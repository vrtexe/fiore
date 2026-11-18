import { div, input, li, span, ul } from 'fiorejs';
import { classList, computed, effect, flush, read, resource, root, selector, state, tick, type Reactive } from '@fiorejs/signals';
// @ts-expect-error the brand is not exported
import { SIGNAL } from '@fiorejs/signals';
void SIGNAL;

const name = state('Ada');

input({ props: { value: name } });
div({
  attrs: { title: computed(() => name.get()) },
  children: [name, computed(() => (name.get().length > 3 ? 'long' : 'short'))],
});

// @ts-expect-error a number signal is not a string value
input({ props: { value: state(1) } });

function Label(props: { text: Reactive<string> }) {
  return div({ children: props.text });
}

Label({ text: 'static' });
Label({ text: name });
Label({ text: computed(() => name.get().toUpperCase()) });
// @ts-expect-error a getter is not live
Label({ text: () => name.get() });
// @ts-expect-error a getter is not a live child
div({ children: () => name.get() });

name.update((value) => value.trim());
// @ts-expect-error update has to return the new value
name.update((value) => value.length);

const doubled: number = read(computed(() => 2));
void doubled;

ul({ children: state(['a', 'b']).map((item) => li({ children: item })) });
ul({ children: [li('head'), state(['a', 'b']).map((item) => li(item))] });
ul({ children: state([{ id: 1 }]).for((item) => item.id).map((item) => li({ children: item.computed((value) => String(value.id)) })) });
const doubledName: number = state(2).computed((value) => value * 2).get();
void doubledName;
// @ts-expect-error map needs a signal of an array
state(1).map(() => li());
// @ts-expect-error for needs a signal of an array
state(1).for();

const user = resource(name, async (value, { signal }) => ({ value, aborted: signal.aborted }));
const loaded: { value: string; aborted: boolean } | undefined = user.get();
const busy: boolean = user.loading.get();
void loaded;
void busy;
user.refetch();
user.mutate({ value: 'x', aborted: false });
div({ children: computed(() => user.get()?.value ?? 'loading') });
const plain = resource(() => 42);
const answer: number | undefined = plain.get();
void answer;

div.props({ className: classList(['card', { active: name, disabled: () => false }]) }).create();

div(state(true).if(() => span('a')).else(() => 'b'));
div(['x', state(0).if(() => span('some'))]);
div(state(0).case(0, () => 'none').case((n) => n > 10, () => span('many')).else(() => 'some'));
// @ts-expect-error a case value has the signal's type
state(0).case('zero', () => 'none');

const stopPre: () => void = effect.pre(() => () => {});
const stopPost: () => void = effect.post(() => {});
void stopPre;
void stopPost;
const flushed: void = flush();
void flushed;
const settled: Promise<void> = tick();
void settled;
const dispose: () => void = root(() => {});
void dispose;
// @ts-expect-error root takes a function without arguments
root((x: number) => x);

// A resource can be cleared without loading.
resource(() => ({ name: 'Ada' })).mutate(undefined);

// A selector gives a boolean signal per key.
const isPicked = selector(state(0));
const picked: boolean = isPicked(1).get();
div.props({ className: classList({ picked: isPicked(2) }) }).create(isPicked(3).if(() => 'yes'));
void picked;

// if gives the branch the truthy value.
const someone = state<{ name: string } | null>(null);
div(someone.if((person) => person.name).else(() => 'nobody'));
