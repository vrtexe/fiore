// Type checks for consumers, compiled with tsc --noEmit by npm test.
import { div, span } from '../lib/html.js';
import svg from '../lib/svg.js';

const isAdmin = false as boolean;

div({ children: [isAdmin && span(), null, undefined, true, 'text', 1, document.createTextNode('x')] });
div({ children: isAdmin ? span() : null });
svg.circle({ attributes: { 'data-id': '1', r: 4 } });
// @ts-expect-error SVG attributes are typed per element
svg.circle({ attributes: { notAnAttribute: 1 } });
