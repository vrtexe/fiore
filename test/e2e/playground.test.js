// Browser journeys of the playground (demo/) and the signals board demo, in every installed Playwright browser.
// Run with `npm run test:e2e`; install the browsers once with `npx playwright install chromium firefox webkit`.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';

const root = fileURLToPath(new URL('../..', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** @type {import('node:http').Server} */
let server;
let base = '';

before(async () => {
  server = createServer(async (request, response) => {
    let file = join(root, normalize(decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname)));
    if (!file.startsWith(root.endsWith(sep) ? root : root + sep)) {
      response.writeHead(403).end();
      return;
    }
    if (file.endsWith(sep)) {
      file = join(file, 'index.html');
    }
    try {
      const body = await readFile(file);
      response.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' }).end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(undefined)));
  const address = server.address();
  base = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
});

after(() => server.close());

for (const [name, type] of Object.entries({ chromium, firefox, webkit })) {
  describe(name, () => {
    /** @type {import('playwright').Browser | undefined} */
    let browser;
    let reason = '';

    before(async () => {
      try {
        browser = await type.launch();
      } catch (error) {
        reason = `${name} is not installed: ${String(error).split('\n')[0]}`;
      }
    });

    after(() => browser?.close());

    /**
     * Opens a page and collects page errors, console errors and failed responses.
     * @param {string} path
     */
    async function open(path) {
      const page = await /** @type {import('playwright').Browser} */ (browser).newPage();
      /** @type {string[]} */
      const errors = [];
      page.on('pageerror', (error) => errors.push(String(error)));
      page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
      page.on('response', (response) => response.status() >= 400 && errors.push(`${response.status()} ${response.url()}`));
      await page.goto(base + path);
      return { page, errors };
    }

    /** Opens the playground through the root page, which redirects to it. */
    async function playground() {
      const opened = await open('/');
      await opened.page.waitForURL('**/demo/index.html');
      await opened.page.waitForFunction(() => document.querySelectorAll('section.flow').length === 8);
      return opened;
    }

    test('the root page opens the playground with every flow and no errors', async (t) => {
      if (!browser) return t.skip(reason);
      const { page, errors } = await playground();

      const ids = await page.evaluate(() => [...document.querySelectorAll('section.flow')].map((section) => section.id));
      assert.deepEqual(ids, ['builders', 'signals', 'scheduling', 'live-children', 'lists', 'lifecycle', 'resource', 'live-protocol']);
      assert.deepEqual(errors, []);
      await page.close();
    });

    test('the signals board demo loads without errors', async (t) => {
      if (!browser) return t.skip(reason);
      const { page, errors } = await open('/packages/signals/demo/board.html');
      await page.waitForLoadState('load');
      await sleep(300);

      assert.deepEqual(errors, []);
      await page.close();
    });

    test('the intro text has a contrast of at least 4.5:1 and the two-way input has a name', async (t) => {
      if (!browser) return t.skip(reason);
      const { page } = await playground();

      const { contrast, label } = await page.evaluate(() => {
        const rgb = (/** @type {string} */ color) => (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
        const luminance = (/** @type {number[]} */ channels) => {
          const [r = 0, g = 0, b = 0] = channels.map((value) => {
            const c = value / 255;
            return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        const intro = /** @type {Element} */ (document.querySelector('.intro'));
        const fg = luminance(rgb(getComputedStyle(intro).color));
        const bg = luminance(rgb(getComputedStyle(document.body).backgroundColor));
        return {
          contrast: (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05),
          label: document.querySelector('#signals input')?.getAttribute('aria-label'),
        };
      });
      assert.ok(contrast >= 4.5, `contrast ${contrast.toFixed(2)}`);
      assert.equal(label, 'Name');
      await page.close();
    });

    test('inline handler attributes are never set or run', async (t) => {
      if (!browser) return t.skip(reason);
      const { page } = await playground();

      const result = await page.evaluate(async () => {
        const { input } = await import('fiorejs');
        const { default: svg } = await import('fiorejs/svg');
        const names = { onunload: 'window.ran = (window.ran ?? 0) + 1', onfocusin: 'window.ran = 9', ONFOCUSOUT: 'window.ran = 9', ongesturestart: 'window.ran = 9' };
        const drawing = svg.svg.attrs(names).create();
        const field = input.attrs(names).create();
        document.body.append(drawing, field);
        field.focus();
        field.blur();
        const kept = [drawing, field].flatMap((node) => node.getAttributeNames().filter((name) => name.startsWith('on')));
        drawing.remove();
        field.remove();
        return { kept, ran: Reflect.get(window, 'ran'), unload: typeof window.onunload };
      });
      assert.deepEqual(result, { kept: [], ran: undefined, unload: 'object' });
      await page.close();
    });

    test('the flows respond to their controls', async (t) => {
      if (!browser) return t.skip(reason);
      const { page, errors } = await playground();

      const result = await page.evaluate(async () => {
        const wait = (/** @type {number} */ ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const cardOf = (/** @type {string} */ section, /** @type {string} */ title) =>
          /** @type {Element} */ ([...document.querySelectorAll(`#${section} .card`)].find((card) => card.querySelector('h3')?.textContent === title));
        const press = async (/** @type {Element} */ scope, /** @type {string} */ label) => {
          const target = [...scope.querySelectorAll('button')].find((button) => button.textContent === label);
          if (!target) throw new Error(`no button ${label}`);
          target.click();
          await wait(60);
        };
        const stage = (/** @type {Element} */ card) => card.querySelector('.stage')?.textContent;
        const out = {};
        const signals = /** @type {Element} */ (document.getElementById('signals'));
        await press(signals, '+1');
        await press(signals, '+1');
        out.counter = stage(cardOf('signals', 'state, computed and effect'));
        await press(signals, 'Try a computed that clamps by writing');
        out.rule = signals.textContent?.includes('A computed cannot set a signal');
        const live = /** @type {Element} */ (document.getElementById('live-children'));
        await press(live, 'normalize()');
        await press(live, 'Simulate translation');
        await press(live, 'Update the value');
        out.robust = stage(cardOf('live-children', 'Robust against outside DOM changes'));
        const ifElse = cardOf('live-children', 'if / else');
        await press(ifElse, 'count + 1');
        await press(ifElse, 'count + 1');
        await press(ifElse, 'count = 0');
        await press(ifElse, 'count + 1');
        out.ifElse = stage(ifElse);
        const cases = cardOf('live-children', 'case');
        const levels = [stage(cases)];
        for (let i = 0; i < 4; i++) {
          await press(cases, 'level + 1');
          levels.push(stage(cases));
        }
        out.cases = levels;
        await press(live, 'Toggle details');
        out.fragment = stage(cardOf('live-children', 'A live child inside a fragment'));
        const lists = /** @type {Element} */ (document.querySelector('#lists .card'));
        const first = lists.querySelector('li');
        await press(lists, 'Reverse');
        out.reversed = [...lists.querySelectorAll('li')].map((li) => li.textContent?.replace('✕', '').trim()).join(',');
        out.rowKept = [...lists.querySelectorAll('li')].includes(/** @type {HTMLLIElement} */ (first));
        const protocol = /** @type {Element} */ (document.getElementById('live-protocol'));
        await press(protocol, 'Click: runs the current handler');
        await press(protocol, 'Use the shout handler');
        await press(protocol, 'Click: runs the current handler');
        out.handler = protocol.querySelector('pre.log')?.textContent?.includes('HELLO');
        return out;
      });
      assert.deepEqual(result, {
        counter: '2 clicks · double: 4',
        rule: true,
        robust: 'Count: two!',
        ifElse: 'some (branch built 2 times)',
        cases: ['none', 'a few', 'a few', 'a few', 'many'],
        fragment: 'row (details shown)',
        reversed: 'bread,eggs,milk',
        rowKept: true,
        handler: true,
      });
      assert.deepEqual(errors, []);
      await page.close();
    });

    test('scheduling: writes batch, flush() updates the DOM at once, pre and post see the DOM before and after, a root stops', async (t) => {
      if (!browser) return t.skip(reason);
      const { page, errors } = await playground();

      const result = await page.evaluate(async () => {
        const wait = (/** @type {number} */ ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const cardOf = (/** @type {string} */ title) =>
          /** @type {Element} */ ([...document.querySelectorAll('#scheduling .card')].find((card) => card.querySelector('h3')?.textContent === title));
        const press = async (/** @type {string} */ title, /** @type {string} */ label) => {
          /** @type {HTMLButtonElement} */ ([...cardOf(title).querySelectorAll('button')].find((button) => button.textContent === label)).click();
          await wait(30);
        };
        const log = (/** @type {string} */ title) => cardOf(title).querySelector('pre.log')?.textContent?.split('\n');
        await press('Batching', 'Set three times');
        await press('flush()', 'Set "two"');
        await press('flush()', 'Set "three", then flush()');
        await press('effect.pre and effect.post', 'size + 1');
        await press('root()', 'Create a widget in a root');
        await wait(1100);
        await press('root()', 'Dispose the root');
        const before = cardOf('root()').querySelector('.stage')?.textContent;
        await wait(1100);
        return {
          batching: log('Batching'),
          reads: log('flush()'),
          phases: log('effect.pre and effect.post'),
          rootStopped: cardOf('root()').querySelector('.stage')?.textContent === before,
        };
      });
      assert.deepEqual(result, {
        batching: ['effect ran: count is 0', 'effect ran: count is 6'],
        reads: ['set "two": the DOM shows "one"', 'set "three", flush(): the DOM shows "three"'],
        phases: ['pre:  size 1, the box shows 1', 'post: size 1, the box shows 1', 'pre:  size 2, the box shows 1', 'post: size 2, the box shows 2'],
        rootStopped: true,
      });
      assert.deepEqual(errors, []);
      await page.close();
    });

    test('resource: "Next three quickly" starts three loads and aborts only the two unfinished ones', async (t) => {
      if (!browser) return t.skip(reason);
      const { page, errors } = await playground();
      const card = page.locator('#resource .card');
      await card.locator('.stage', { hasText: 'User 1' }).waitFor();
      await card.getByRole('button', { name: 'Clear log' }).click();

      await card.getByRole('button', { name: 'Next three quickly' }).click();
      await card.locator('.stage', { hasText: 'User 4' }).waitFor();

      const log = (await card.locator('pre.log').textContent())?.split('\n') ?? [];
      assert.deepEqual(log.filter((line) => line.startsWith('load user')), ['load user 2', 'load user 3', 'load user 4']);
      assert.deepEqual(log.filter((line) => line.startsWith('aborted')), ['aborted the load of user 2', 'aborted the load of user 3']);
      assert.deepEqual(errors, []);
      await page.close();
    });

    test('lifecycle: a binding pauses while its element is out of the document and resumes after', async (t) => {
      if (!browser) return t.skip(reason);
      const { page } = await playground();

      const result = await page.evaluate(async () => {
        const wait = (/** @type {number} */ ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const section = /** @type {Element} */ (document.getElementById('lifecycle'));
        const press = (/** @type {string} */ label) =>
          /** @type {HTMLButtonElement} */ ([...section.querySelectorAll('button')].find((button) => button.textContent === label)).click();
        // The span the binding writes "tick N" into; the clock ticks every second.
        const watched = /** @type {Element} */ (section.querySelector('.card .stage span'));
        press('Remove from the page');
        await wait(50);
        const atRemoval = watched.textContent;
        await wait(2200);
        const whileRemoved = watched.textContent;
        press('Insert again');
        for (let i = 0; i < 40 && watched.textContent === whileRemoved; i++) {
          await wait(50);
        }
        return { atRemoval, whileRemoved, afterInsert: watched.textContent };
      });
      // Paused: the text did not change while the span was out of the document.
      assert.equal(result.whileRemoved, result.atRemoval);
      assert.match(result.atRemoval ?? '', /^tick \d+$/);
      // Resumed: inserting it again applied the current, later tick.
      assert.notEqual(result.afterInsert, result.whileRemoved);
      assert.match(result.afterInsert ?? '', /^tick \d+$/);
      await page.close();
    });
  });
}
