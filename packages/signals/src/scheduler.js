/**
 * An effect as the flush sees it: `queued` while it waits, and how often it ran in the flush numbered `flush`.
 * @typedef {{ id: number, queued: boolean, flush: number, runs: number, run(): void, stop(): void }} Queued
 */

/** @type {[Queued[], Queued[], Queued[]]} Effects waiting for the flush, by phase: pre, normal, post. */
const queues = [[], [], []];

/** @type {[Queued[], Queued[], Queued[]]} Empty arrays that take the place of a queue while its batch runs. */
const spares = [[], [], []];

/** Whether an effect joined a queue out of creation order, so the queue is sorted before it runs. */
const unsorted = [false, false, false];

/** True while work waits for the flush. */
let scheduled = false;

/** True while the microtask that flushes is queued; a flush() before it runs leaves it nothing to do. */
let task = false;

let flushing = false;
/** Counts effect runs in progress, so flush() inside one, also in a first run outside a flush, does nothing. */
let running = 0;

/** Numbers flushes, so an effect can count its runs per flush. */
let flushes = 0;

/** @typedef {{ error: unknown }} Failure */
/** @type {Failure|undefined} The first error of the running flush. */
let failure;

/**  @typedef {{ resolve(): void, reject(error: unknown): void }} Waiter*/
/** @type {Waiter[]} The tick() promises waiting for the flush. */
let waiters = [];

/** How often one effect may run in a single flush before it counts as a loop. */
const MAX_RUNS = 100;

/**
 * Queues an effect for the flush once, and the flush on a microtask unless it is queued or running; a running flush
 * takes new work itself.
 * @param {Queued} node
 * @param {0 | 1 | 2} phase
 */
export function enqueue(node, phase) {
  if (node.queued) {
    return;
  }
  node.queued = true;
  const queue = queues[phase];
  const last = queue[queue.length - 1];
  if (last && last.id > node.id) {
    unsorted[phase] = true;
  }
  queue.push(node);
  if (scheduled || flushing) {
    return;
  }
  scheduled = true;
  if (!task) {
    task = true;
    queueMicrotask(runTask);
  }
}

/** The microtask that flushes. */
function runTask() {
  task = false;
  if (scheduled) {
    settle(true);
  }
}

/**
 * Orders effects by creation.
 * @param {Queued} a
 * @param {Queued} b
 */
function byId(a, b) {
  return a.id - b.id;
}

/**
 * Runs the effects and bindings that are waiting now, instead of on the next microtask, for example before reading
 * the DOM after a change. Inside an effect it does nothing: the running flush, or the next one, runs them.
 */
export function flush() {
  if (!flushing && running === 0) {
    settle(false);
  }
}

/** Marks the start of an effect run. */
export function enterRun() {
  running++;
}

/** Marks the end of an effect run. */
export function exitRun() {
  running--;
}

/**
 * Returns a promise that resolves after the waiting effects and bindings have run, or right away when none wait. It
 * rejects with the first error of that flush.
 * @returns {Promise<void>}
 */
export function tick() {
  return new Promise((resolve, reject) => {
    if (scheduled || flushing) {
      waiters.push({ resolve, reject });
    } else {
      resolve();
    }
  });
}

/**
 * Runs queued effects until none is left: the pre phase, then effects and bindings, then the post phase, each in
 * creation order. A write during the flush queues more work, and the flush goes back to the first phase that has
 * some. Every effect runs even when another throws; the first error is thrown at the end.
 * @param {boolean} queued whether the flush runs from its microtask, where a waiting tick() takes the error
 */
function settle(queued) {
  scheduled = false;
  flushing = true;
  const flush = ++flushes;
  try {
    for (;;) {
      const phase = firstPhase();
      if (phase === -1) {
        break;
      }
      // Work queued while this batch runs goes to the spare queue, for the next round; the batch is the spare after it.
      const batch = queues[phase];
      queues[phase] = spares[phase];
      spares[phase] = batch;
      if (unsorted[phase]) {
        unsorted[phase] = false;
        batch.sort(byId);
      }
      try {
        runBatch(batch, flush);
      } finally {
        batch.length = 0;
      }
    }
  } finally {
    flushing = false;
  }
  const result = failure;
  failure = undefined;
  const waiting = waiters;
  if (waiting.length > 0) {
    waiters = [];
    for (const waiter of waiting) {
      if (result) {
        waiter.reject(result.error);
      } else {
        waiter.resolve();
      }
    }
  }
  if (result && !(queued && waiting.length > 0)) {
    throw result.error;
  }
}

/**
 * Runs the effects of one batch, each once, in order.
 * @param {Queued[]} batch
 * @param {number} flush the number of the running flush
 */
function runBatch(batch, flush) {
  for (const node of batch) {
    // An effect stopped since it was queued is skipped.
    if (!node.queued) {
      continue;
    }
    node.queued = false;
    if (node.flush !== flush) {
      node.flush = flush;
      node.runs = 0;
    }
    if (++node.runs > MAX_RUNS) {
      // Only the looping effect stops; the others still run.
      fail(
        new Error(`An effect ran more than ${MAX_RUNS} times in one flush; it probably sets a signal it reads.`),
      );
      node.stop();
      continue;
    }
    node.run();
  }
}

/**
 * The first phase with queued effects, or -1.
 * @returns {0 | 1 | 2 | -1}
 */
function firstPhase() {
  return queues[0].length > 0 ? 0 : queues[1].length > 0 ? 1 : queues[2].length > 0 ? 2 : -1;
}

/**
 * Keeps the first error of the running flush, to throw at its end; later errors and errors outside a flush are
 * reported, so none is lost.
 * @param {unknown} error
 */
export function fail(error) {
  if (flushing && !failure) {
    failure = { error };
  } else {
    report(error);
  }
}

/** @param {unknown} error */
export function report(error) {
  if (typeof globalThis.reportError === "function") {
    globalThis.reportError(error);
  } else {
    console.error(error);
  }
}
