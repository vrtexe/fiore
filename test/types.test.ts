import { div, input } from 'fiorejs';
import { computed, read, state, type Reactive } from '@fiorejs/signals';

const name = state('Ada');

input({ props: { value: name } });
div({
  attributes: { title: () => name.get() },
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
