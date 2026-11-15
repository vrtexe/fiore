import { element, htmlTag } from './core/html.js';

export { element };
export { use } from './core/plugins.js';

/** @typedef {import('./types/base.dom.d.ts').Plugin} Plugin */
/** @typedef {import('./types/base.dom.d.ts').BindContext} BindContext */
/**
 * @template T
 * @typedef {import('./types/base.dom.d.ts').Live<T>} Live
 */
/** @typedef {import('./types/html.dom.d.ts').HTMLBuilder} HTMLBuilder */
/** @typedef {import('./types/html.dom.d.ts').HTMLModifier} HTMLModifier */

export const a = /* @__PURE__ */ htmlTag('a');
export const abbr = /* @__PURE__ */ htmlTag('abbr');
export const address = /* @__PURE__ */ htmlTag('address');
export const area = /* @__PURE__ */ htmlTag('area');
export const article = /* @__PURE__ */ htmlTag('article');
export const aside = /* @__PURE__ */ htmlTag('aside');
export const audio = /* @__PURE__ */ htmlTag('audio');
export const b = /* @__PURE__ */ htmlTag('b');
export const base = /* @__PURE__ */ htmlTag('base');
export const bdi = /* @__PURE__ */ htmlTag('bdi');
export const bdo = /* @__PURE__ */ htmlTag('bdo');
export const blockquote = /* @__PURE__ */ htmlTag('blockquote');
export const body = /* @__PURE__ */ htmlTag('body');
export const br = /* @__PURE__ */ htmlTag('br');
export const button = /* @__PURE__ */ htmlTag('button');
export const canvas = /* @__PURE__ */ htmlTag('canvas');
export const caption = /* @__PURE__ */ htmlTag('caption');
export const cite = /* @__PURE__ */ htmlTag('cite');
export const code = /* @__PURE__ */ htmlTag('code');
export const col = /* @__PURE__ */ htmlTag('col');
export const colgroup = /* @__PURE__ */ htmlTag('colgroup');
export const data = /* @__PURE__ */ htmlTag('data');
export const datalist = /* @__PURE__ */ htmlTag('datalist');
export const dd = /* @__PURE__ */ htmlTag('dd');
export const del = /* @__PURE__ */ htmlTag('del');
export const details = /* @__PURE__ */ htmlTag('details');
export const dfn = /* @__PURE__ */ htmlTag('dfn');
export const dialog = /* @__PURE__ */ htmlTag('dialog');
export const div = /* @__PURE__ */ htmlTag('div');
export const dl = /* @__PURE__ */ htmlTag('dl');
export const dt = /* @__PURE__ */ htmlTag('dt');
export const em = /* @__PURE__ */ htmlTag('em');
export const embed = /* @__PURE__ */ htmlTag('embed');
export const fieldset = /* @__PURE__ */ htmlTag('fieldset');
export const figcaption = /* @__PURE__ */ htmlTag('figcaption');
export const figure = /* @__PURE__ */ htmlTag('figure');
export const footer = /* @__PURE__ */ htmlTag('footer');
export const form = /* @__PURE__ */ htmlTag('form');
export const h1 = /* @__PURE__ */ htmlTag('h1');
export const h2 = /* @__PURE__ */ htmlTag('h2');
export const h3 = /* @__PURE__ */ htmlTag('h3');
export const h4 = /* @__PURE__ */ htmlTag('h4');
export const h5 = /* @__PURE__ */ htmlTag('h5');
export const h6 = /* @__PURE__ */ htmlTag('h6');
export const head = /* @__PURE__ */ htmlTag('head');
export const header = /* @__PURE__ */ htmlTag('header');
export const hgroup = /* @__PURE__ */ htmlTag('hgroup');
export const hr = /* @__PURE__ */ htmlTag('hr');
export const html = /* @__PURE__ */ htmlTag('html');
export const i = /* @__PURE__ */ htmlTag('i');
export const iframe = /* @__PURE__ */ htmlTag('iframe');
export const img = /* @__PURE__ */ htmlTag('img');
export const input = /* @__PURE__ */ htmlTag('input');
export const ins = /* @__PURE__ */ htmlTag('ins');
export const kbd = /* @__PURE__ */ htmlTag('kbd');
export const label = /* @__PURE__ */ htmlTag('label');
export const legend = /* @__PURE__ */ htmlTag('legend');
export const li = /* @__PURE__ */ htmlTag('li');
export const link = /* @__PURE__ */ htmlTag('link');
export const main = /* @__PURE__ */ htmlTag('main');
export const map = /* @__PURE__ */ htmlTag('map');
export const mark = /* @__PURE__ */ htmlTag('mark');
export const menu = /* @__PURE__ */ htmlTag('menu');
export const meta = /* @__PURE__ */ htmlTag('meta');
export const meter = /* @__PURE__ */ htmlTag('meter');
export const nav = /* @__PURE__ */ htmlTag('nav');
export const noscript = /* @__PURE__ */ htmlTag('noscript');
export const object = /* @__PURE__ */ htmlTag('object');
export const ol = /* @__PURE__ */ htmlTag('ol');
export const optgroup = /* @__PURE__ */ htmlTag('optgroup');
export const option = /* @__PURE__ */ htmlTag('option');
export const output = /* @__PURE__ */ htmlTag('output');
export const p = /* @__PURE__ */ htmlTag('p');
export const picture = /* @__PURE__ */ htmlTag('picture');
export const pre = /* @__PURE__ */ htmlTag('pre');
export const progress = /* @__PURE__ */ htmlTag('progress');
export const q = /* @__PURE__ */ htmlTag('q');
export const rp = /* @__PURE__ */ htmlTag('rp');
export const rt = /* @__PURE__ */ htmlTag('rt');
export const ruby = /* @__PURE__ */ htmlTag('ruby');
export const s = /* @__PURE__ */ htmlTag('s');
export const samp = /* @__PURE__ */ htmlTag('samp');
export const script = /* @__PURE__ */ htmlTag('script');
export const search = /* @__PURE__ */ htmlTag('search');
export const section = /* @__PURE__ */ htmlTag('section');
export const select = /* @__PURE__ */ htmlTag('select');
export const slot = /* @__PURE__ */ htmlTag('slot');
export const small = /* @__PURE__ */ htmlTag('small');
export const source = /* @__PURE__ */ htmlTag('source');
export const span = /* @__PURE__ */ htmlTag('span');
export const strong = /* @__PURE__ */ htmlTag('strong');
export const style = /* @__PURE__ */ htmlTag('style');
export const sub = /* @__PURE__ */ htmlTag('sub');
export const summary = /* @__PURE__ */ htmlTag('summary');
export const sup = /* @__PURE__ */ htmlTag('sup');
export const table = /* @__PURE__ */ htmlTag('table');
export const tbody = /* @__PURE__ */ htmlTag('tbody');
export const td = /* @__PURE__ */ htmlTag('td');
export const template = /* @__PURE__ */ htmlTag('template');
export const textarea = /* @__PURE__ */ htmlTag('textarea');
export const tfoot = /* @__PURE__ */ htmlTag('tfoot');
export const th = /* @__PURE__ */ htmlTag('th');
export const thead = /* @__PURE__ */ htmlTag('thead');
export const time = /* @__PURE__ */ htmlTag('time');
export const title = /* @__PURE__ */ htmlTag('title');
export const tr = /* @__PURE__ */ htmlTag('tr');
export const track = /* @__PURE__ */ htmlTag('track');
export const u = /* @__PURE__ */ htmlTag('u');
export const ul = /* @__PURE__ */ htmlTag('ul');
export const var_ = /* @__PURE__ */ htmlTag('var');
export const video = /* @__PURE__ */ htmlTag('video');
export const wbr = /* @__PURE__ */ htmlTag('wbr');

export default Object.freeze({
  element,
  a,
  abbr,
  address,
  area,
  article,
  aside,
  audio,
  b,
  base,
  bdi,
  bdo,
  blockquote,
  body,
  br,
  button,
  canvas,
  caption,
  cite,
  code,
  col,
  colgroup,
  data,
  datalist,
  dd,
  del,
  details,
  dfn,
  dialog,
  div,
  dl,
  dt,
  em,
  embed,
  fieldset,
  figcaption,
  figure,
  footer,
  form,
  h1,
  h2,
  h3,
  h4,
  h5,
  h6,
  head,
  header,
  hgroup,
  hr,
  html,
  i,
  iframe,
  img,
  input,
  ins,
  kbd,
  label,
  legend,
  li,
  link,
  main,
  map,
  mark,
  menu,
  meta,
  meter,
  nav,
  noscript,
  object,
  ol,
  optgroup,
  option,
  output,
  p,
  picture,
  pre,
  progress,
  q,
  rp,
  rt,
  ruby,
  s,
  samp,
  script,
  search,
  section,
  select,
  slot,
  small,
  source,
  span,
  strong,
  style,
  sub,
  summary,
  sup,
  table,
  tbody,
  td,
  template,
  textarea,
  tfoot,
  th,
  thead,
  time,
  title,
  tr,
  track,
  u,
  ul,
  var_,
  video,
  wbr,
});
