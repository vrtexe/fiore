import { mathElement } from './core/math.js';

export { mathElement as element };

/** @typedef {import('./types/base.dom.d.ts').Children} Children */

/** @deprecated `a` is not a MathML element; wrap the math in an HTML `a` or set an `href` attribute instead. */
export const a = /* @__PURE__ */ mathElement('a');
export const annotation = /* @__PURE__ */ mathElement('annotation');
export const annotationXml = /* @__PURE__ */ mathElement('annotation-xml');
export const maction = /* @__PURE__ */ mathElement('maction');
export const math = /* @__PURE__ */ mathElement('math');
export const merror = /* @__PURE__ */ mathElement('merror');
export const mfrac = /* @__PURE__ */ mathElement('mfrac');
export const mi = /* @__PURE__ */ mathElement('mi');
export const mmultiscripts = /* @__PURE__ */ mathElement('mmultiscripts');
export const mn = /* @__PURE__ */ mathElement('mn');
export const mo = /* @__PURE__ */ mathElement('mo');
export const mover = /* @__PURE__ */ mathElement('mover');
export const mpadded = /* @__PURE__ */ mathElement('mpadded');
export const mphantom = /* @__PURE__ */ mathElement('mphantom');
export const mprescripts = /* @__PURE__ */ mathElement('mprescripts');
export const mroot = /* @__PURE__ */ mathElement('mroot');
export const mrow = /* @__PURE__ */ mathElement('mrow');
export const ms = /* @__PURE__ */ mathElement('ms');
export const mspace = /* @__PURE__ */ mathElement('mspace');
export const msqrt = /* @__PURE__ */ mathElement('msqrt');
export const mstyle = /* @__PURE__ */ mathElement('mstyle');
export const msub = /* @__PURE__ */ mathElement('msub');
export const msubsup = /* @__PURE__ */ mathElement('msubsup');
export const msup = /* @__PURE__ */ mathElement('msup');
export const mtable = /* @__PURE__ */ mathElement('mtable');
export const mtd = /* @__PURE__ */ mathElement('mtd');
export const mtext = /* @__PURE__ */ mathElement('mtext');
export const mtr = /* @__PURE__ */ mathElement('mtr');
export const munder = /* @__PURE__ */ mathElement('munder');
export const munderover = /* @__PURE__ */ mathElement('munderover');
export const semantics = /* @__PURE__ */ mathElement('semantics');

export default {
  element: mathElement,
  a,
  annotation,
  annotationXml,
  maction,
  math,
  merror,
  mfrac,
  mi,
  mmultiscripts,
  mn,
  mo,
  mover,
  mpadded,
  mphantom,
  mprescripts,
  mroot,
  mrow,
  ms,
  mspace,
  msqrt,
  mstyle,
  msub,
  msubsup,
  msup,
  mtable,
  mtd,
  mtext,
  mtr,
  munder,
  munderover,
  semantics,
};
