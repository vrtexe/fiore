// A small highlighter for JavaScript and TypeScript: comments, strings, keywords and called names.
const KEYWORDS =
  /\b(import|from|export|default|const|let|var|function|return|if|else|for|of|in|new|class|extends|await|async|type|interface|true|false|null|undefined|typeof|as)\b/;
const TOKEN = new RegExp(
  [
    /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/.source,
    /('(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`)/.source,
    KEYWORDS.source,
    /([A-Za-z_$][\w$]*)(?=\s*\()/.source,
  ].join('|'),
  'g',
);
const escapeHtml = (text) => text.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

/** Highlights every JavaScript or TypeScript code block inside `root`. */
export function highlight(root = document) {
  for (const code of root.querySelectorAll('pre code[class*="language-js"], pre code[class*="language-ts"]')) {
    const source = code.textContent;
    let out = '';
    let last = 0;
    for (const match of source.matchAll(TOKEN)) {
      out += escapeHtml(source.slice(last, match.index));
      const [text, comment, string, keyword, call] = match;
      const cls = comment ? 'punc' : string ? 'str' : keyword ? 'kw' : call ? 'fn' : '';
      out += `<span class="${cls}">${escapeHtml(text)}</span>`;
      last = match.index + text.length;
    }
    code.innerHTML = out + escapeHtml(source.slice(last));
  }
}
