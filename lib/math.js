import { mathElement, mathTag } from './core/math.js';

export { mathElement as element };

/** @deprecated `a` is not a MathML element; wrap the math in an HTML `a` or set an `href` attribute instead. */
export const a = /* @__PURE__ */ mathTag(/** @type {'mrow'} */ ('a'));
export const annotation = /* @__PURE__ */ mathTag('annotation');
export const annotationXml = /* @__PURE__ */ mathTag('annotation-xml');
export const maction = /* @__PURE__ */ mathTag('maction');
export const math = /* @__PURE__ */ mathTag('math');
export const merror = /* @__PURE__ */ mathTag('merror');
export const mfrac = /* @__PURE__ */ mathTag('mfrac');
export const mi = /* @__PURE__ */ mathTag('mi');
export const mmultiscripts = /* @__PURE__ */ mathTag('mmultiscripts');
export const mn = /* @__PURE__ */ mathTag('mn');
export const mo = /* @__PURE__ */ mathTag('mo');
export const mover = /* @__PURE__ */ mathTag('mover');
export const mpadded = /* @__PURE__ */ mathTag('mpadded');
export const mphantom = /* @__PURE__ */ mathTag('mphantom');
export const mprescripts = /* @__PURE__ */ mathTag('mprescripts');
export const mroot = /* @__PURE__ */ mathTag('mroot');
export const mrow = /* @__PURE__ */ mathTag('mrow');
export const ms = /* @__PURE__ */ mathTag('ms');
export const mspace = /* @__PURE__ */ mathTag('mspace');
export const msqrt = /* @__PURE__ */ mathTag('msqrt');
export const mstyle = /* @__PURE__ */ mathTag('mstyle');
export const msub = /* @__PURE__ */ mathTag('msub');
export const msubsup = /* @__PURE__ */ mathTag('msubsup');
export const msup = /* @__PURE__ */ mathTag('msup');
export const mtable = /* @__PURE__ */ mathTag('mtable');
export const mtd = /* @__PURE__ */ mathTag('mtd');
export const mtext = /* @__PURE__ */ mathTag('mtext');
export const mtr = /* @__PURE__ */ mathTag('mtr');
export const munder = /* @__PURE__ */ mathTag('munder');
export const munderover = /* @__PURE__ */ mathTag('munderover');
export const semantics = /* @__PURE__ */ mathTag('semantics');

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
