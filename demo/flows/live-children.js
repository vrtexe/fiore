import { b, div, em, fragment, i } from 'fiorejs';
import { flush, state } from '@fiorejs/signals';
import { action, card, domView, flow, logger } from '../debug.js';

const words = ['one', 'two', 'three', 'four', 'five'];

export default function liveChildren() {
  // 1. A lone live child fills its element; with siblings it lives between two comment markers.
  const text = state('hello');
  const only = div(text);
  const withSiblings = div(['[', text, ']']);

  // 2. One live child can switch between text, a node, a list of nodes, nested arrays and nothing.
  const content = state('text');
  const switching = div(['<', content, '>']);

  // 3. The DOM between the markers is the only state, so outside DOM changes do not break updates.
  let next = 0;
  const word = state(words[0]);
  const robust = div(['Count: ', word, '!']);
  const events = logger();
  const liveText = () => [...robust.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.data === word.get());

  // 4. if/else switches between two branches; only the shown one is built, and it is rebuilt only when the truthiness flips.
  const count = state(0);
  let builds = 0;
  const conditional = div(count.computed(Boolean).if(() => (builds++, b(`some (branch built ${builds} times)`))).else(() => em('none')));

  // A case condition shows the branch of the first case that matches.
  const level = state(0);
  const cases = div(
    level
      .case(0, () => em('none'))
      .case((n) => n > 3, () => b('many'))
      .else(() => 'a few'),
  );

  // 5. A fragment that contains a live child keeps updating after it is inserted somewhere else.
  const open = state(false);
  const fragmentHost = div(fragment([b('row'), open.computed((value) => (value ? em(' (details shown)') : null))]));

  return flow('live-children', 'Live children', 'A live value as a child: how its nodes are tracked, what the comment markers are, and why outside DOM changes such as normalize() or page translation do not break it.', [
    card('Only child versus siblings', div([only, withSiblings]), [action('Change text', () => text.set(`hello ${Math.floor(Math.random() * 100)}`))], { view: div([domView(only), domView(withSiblings)]) }),
    card(
      'Text, node, list, nested, nothing',
      switching,
      [
        action('text', () => content.set('plain text')),
        action('node', () => content.set(b('a bold node'))),
        action('list', () => content.set([i('one'), ', ', i('two'), ', ', i('three')])),
        action('nested', () => content.set(['a', ['b', ['c']]])),
        action('nothing', () => content.set(null)),
      ],
      { view: domView(switching) },
    ),
    card(
      'Robust against outside DOM changes',
      robust,
      [
        action('normalize()', () => {
          robust.normalize();
          events.write(`normalize(): the parent now has ${robust.childNodes.length} child nodes`);
        }),
        action('Simulate translation', () => {
          const node = liveText();
          if (node) {
            const font = document.createElement('font');
            font.textContent = node.data.toUpperCase();
            node.replaceWith(font);
            events.write('replaced the live text node with <font>, as page translation does');
          }
        }),
        action('Update the value', () => {
          next = (next + 1) % words.length;
          word.set(words[next]);
          // The DOM updates in the next flush; flush() runs it now, so the text below is the new one.
          flush();
          events.write(`set "${words[next]}": shown "${robust.textContent}"`);
        }),
      ],
      events,
    ),
    card('if / else', conditional, [action('count + 1', () => count.update((value) => value + 1)), action('count = 0', () => count.set(0))], { view: domView(conditional) }),
    card('case', cases, [action('level + 1', () => level.update((value) => value + 1)), action('level = 0', () => level.set(0))], { view: domView(cases) }),
    card('A live child inside a fragment', fragmentHost, [action('Toggle details', () => open.update((value) => !value))], { view: domView(fragmentHost) }),
  ]);
}
