// A small highlighter for JavaScript, TypeScript and JSX: comments, strings, keywords, called names and JSX tags.
const KEYWORDS =
  /\b(import|from|export|default|const|let|var|function|return|if|else|for|of|in|new|class|extends|await|async|type|interface|true|false|null|undefined|typeof|as)\b/;
const PARTS = [
  /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/.source,
  /('(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`)/.source,
  KEYWORDS.source,
  /([A-Za-z_$][\w$]*)(?=\s*\()/.source,
];
const TOKEN = new RegExp(PARTS.join('|'), 'g');
// In JSX an opening or closing tag name is highlighted too; `a < b` with spaces is left alone.
const JSX_TOKEN = new RegExp([...PARTS, /(<\/?[A-Za-z][\w.-]*|\/>)/.source].join('|'), 'g');
const escapeHtml = (text) => text.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

/** Highlights every JavaScript, TypeScript or JSX code block inside `root`. */
export function highlight(root = document) {
  for (const code of root.querySelectorAll('pre code[class*="language-js"], pre code[class*="language-ts"]')) {
    const jsx = /language-(jsx|tsx)/.test(code.className);
    const source = code.textContent;
    let out = '';
    let last = 0;
    for (const match of source.matchAll(jsx ? JSX_TOKEN : TOKEN)) {
      out += escapeHtml(source.slice(last, match.index));
      const [text, comment, string, keyword, call, tag] = match;
      const cls = comment ? 'punc' : string ? 'str' : keyword ? 'kw' : call ? 'fn' : tag ? 'fn' : '';
      out += `<span class="${cls}">${escapeHtml(text)}</span>`;
      last = match.index + text.length;
    }
    code.innerHTML = out + escapeHtml(source.slice(last));
  }
}
