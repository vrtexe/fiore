import { a } from 'fiorejs';
import builders from './flows/builders.js';
import signals from './flows/signals.js';
import liveChildren from './flows/live-children.js';
import lists from './flows/lists.js';
import lifecycle from './flows/lifecycle.js';
import resources from './flows/resource.js';
import liveProtocol from './flows/live-protocol.js';
import scheduling from './flows/scheduling.js';

const flows = [builders, signals, scheduling, liveChildren, lists, lifecycle, resources, liveProtocol];
const app = document.getElementById('app');
const nav = document.getElementById('nav');

for (const make of flows) {
  const section = make();
  app.append(section);
  nav.append(a.attrs({ href: `#${section.id}` }).create(section.querySelector('h2').textContent));
}
