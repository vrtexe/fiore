import { LIVE, button, div, span } from 'fiorejs';
import { state } from '@fiorejs/signals';
import { action, card, flow, logger } from '../debug.js';

/** Any object with a [LIVE] method is a live value; this one is a clock that is not a signal. */
class Clock {
  constructor(format) {
    this.format = format;
  }

  [LIVE](apply, context) {
    apply(this.format(new Date()));
    // A real integration would stop this when the element leaves the page; the demo clock runs for the page's lifetime.
    setInterval(() => apply(this.format(new Date())), 1000);
    log.write(`bound to a ${context.kind}${context.name ? ` (${context.name})` : ''}`);
  }
}

const log = logger();

export default function liveProtocol() {
  const time = new Clock((date) => date.toLocaleTimeString());

  // A signal holding a function under an inline handler prop swaps the handler.
  const greet = () => log.write('handler: hello');
  const shout = () => log.write('handler: HELLO!');
  const handler = state(greet);
  const target = button.props({ onclick: handler }).create('Click: runs the current handler');

  // A plain function is never live: it is a callback or static content.
  const notLive = div(['A function child is not live: ', span(() => 'this function is shown as text')]);

  return flow('live-protocol', 'The live protocol', 'fiorejs binds any value with a [Symbol.for(\'fiorejs.live\')] method. Signals have one; here a custom clock does too. A plain function never is.', [
    card('A custom live value', div(['Time: ', span(time), ' · as an attribute: ', span.attrs({ title: time }).create('(hover me)')]), [], log),
    card('A live handler prop', target, [action('Use the greet handler', () => handler.set(greet)), action('Use the shout handler', () => handler.set(shout))]),
    card('Functions are not live', notLive),
  ]);
}
