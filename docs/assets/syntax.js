// The Builder / JSX switch shared by the guide and the tutorial. The choice is kept in localStorage and set as
// <html data-syntax="builder|jsx">; CSS hides every [data-syntax] element of the other syntax.
// Markup: a pair of examples is <div class="code-pair"> with one <pre data-syntax="builder"> and one
// <pre data-syntax="jsx">; any other element with data-syntax, such as a paragraph, follows the same choice.

const KEY = 'fiore-syntax';

/** The reader's syntax, 'builder' or 'jsx'. */
export function getSyntax() {
  try {
    return localStorage.getItem(KEY) === 'jsx' ? 'jsx' : 'builder';
  } catch {
    return 'builder';
  }
}

/** Switches every page element to `mode` and remembers it. */
export function setSyntax(mode) {
  document.documentElement.dataset.syntax = mode;
  try {
    localStorage.setItem(KEY, mode);
  } catch {}
  for (const group of document.querySelectorAll('.syntax-switch')) {
    for (const button of group.querySelectorAll('button')) {
      button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
    }
  }
  dispatchEvent(new CustomEvent('syntaxchange', { detail: mode }));
}

/** A two-button switch; every switch on the page shows the same choice. */
export function createSwitch() {
  const group = document.createElement('div');
  group.className = 'syntax-switch';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', 'Code syntax');
  for (const [mode, label] of [
    ['builder', 'Builder'],
    ['jsx', 'JSX'],
  ]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.mode = mode;
    button.textContent = label;
    button.setAttribute('aria-pressed', String(getSyntax() === mode));
    button.addEventListener('click', () => setSyntax(mode));
    group.append(button);
  }
  return group;
}

/** Applies the stored choice and puts a switch above every pair of examples inside `root`. */
export function mountSyntax(root = document) {
  document.documentElement.dataset.syntax = getSyntax();
  for (const pair of root.querySelectorAll('.code-pair')) {
    if (!pair.querySelector(':scope > .syntax-switch')) {
      pair.prepend(createSwitch());
    }
  }
}
