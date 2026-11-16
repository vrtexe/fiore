import { button, div, h2, h3, p, pre, section } from 'fiorejs';

/** A flow section with a title, an explanation and its cards. */
export function flow(id, title, intro, cards) {
  return section.attrs({ id, class: 'flow' }).create([h2(title), p.attrs({ class: 'intro' }).create(intro), div.attrs({ class: 'grid' }).create(cards)]);
}

/** A card with a title, the element under test in a dashed stage, controls, and an optional log. */
export function card(title, stage, controls = [], log = null) {
  return div.attrs({ class: 'card' }).create([
    h3(title),
    div.attrs({ class: 'stage' }).create(stage),
    div.attrs({ class: 'row' }).create(controls),
    log ? log.view : null,
  ]);
}

/** A button. */
export function action(label, onClick) {
  return button.on({ click: onClick }).create(label);
}

/** A small log: write lines, read them in the card. */
export function logger() {
  const view = pre.attrs({ class: 'log' }).create('');
  let lines = [];
  return {
    view,
    write(line) {
      lines = [...lines.slice(-11), line];
      view.textContent = lines.join('\n');
    },
    clear() {
      lines = [];
      view.textContent = '';
    },
  };
}

/** Shows an element's child nodes as markup, with the comment markers of live children visible. */
export function domView(target) {
  const view = pre.attrs({ class: 'dom' }).create('');
  const refresh = () => {
    view.textContent = target.innerHTML.replaceAll('<!---->', '⟨marker⟩') || '(empty)';
  };
  refresh();
  new MutationObserver(refresh).observe(target, { childList: true, subtree: true, characterData: true, attributes: true });
  return view;
}
