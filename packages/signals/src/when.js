import { LIVE } from 'fiorejs';
import { adopt, own } from './tracking.js';
import { attach } from './dom.js';

/**
 * @template T
 * @typedef {import('./signal.js').Signal<T>} Signal
 */

/**
 * A live value that shows the branch of the first case the signal's value matches, or the other branch when none does.
 * A case's branch gets the value and is built when it is shown and again when the value changes (`Object.is`); the
 * other branch is built when it is shown. A branch is built outside the binding's tracking, and what it builds stops
 * when it is built again or another branch is shown.
 * @template A, B
 */
export class When {
  /**
   * @param {Signal<unknown>} source
   * @param {[unknown, (value: any) => A][]} cases
   * @param {() => B} otherwise
   */
  constructor(source, cases, otherwise) {
    this._source = source;
    this._cases = cases;
    this._otherwise = otherwise;
  }

  /**
   * Adds a case, tried after the earlier ones.
   * @template C
   * @param {unknown} match
   * @param {(value: any) => C} render
   * @returns {When<A | C, B>}
   */
  case(match, render) {
    /** @type {[unknown, (value: any) => A | C][]} */
    const cases = [...this._cases, [match, render]];
    return new When(this._source, cases, this._otherwise);
  }

  /**
   * Shows what `otherwise` returns while no case matches.
   * @template C
   * @param {() => C} otherwise
   * @returns {When<A, C>}
   */
  else(otherwise) {
    return new When(this._source, this._cases, otherwise);
  }

  /**
   * @param {(value: unknown) => void} apply
   * @param {import('fiorejs/type/base.dom.d.ts').BindContext} context
   */
  [LIVE](apply, context) {
    /** @type {number | undefined} The index of the shown case, -1 for the other branch. */
    let shown;
    /** @type {unknown} The value the shown branch was built for. */
    let shownFor;
    /** @type {A | B | undefined} */
    let value;
    /** Stops what the shown branch created. */
    let stopBranch = () => {};
    adopt(() => stopBranch());

    attach(
      () => {
        const current = this._source.get();
        const index = this._cases.findIndex(([match]) =>
          typeof match === 'function' ? match(current) : Object.is(match, current),
        );
        if (index !== shown || (index !== -1 && !Object.is(current, shownFor))) {
          // Cleared first, so a branch that fails to build is built again on the next run instead of showing the old one.
          shown = undefined;
          stopBranch();
          const branch = this._cases[index];
          /** @type {() => A | B} */
          const render = branch ? () => branch[1](current) : this._otherwise;
          ({ value, stop: stopBranch } = own(render));
          shown = index;
          shownFor = current;
        }
        return value;
      },
      apply,
      context,
    );
  }
}
