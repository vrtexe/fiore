import { enqueue, enterRun, exitRun, fail, runSync } from './scheduler.js';

/** @typedef {import('./scheduler.js').Queued} Queued */

// The state of a node, as bits of `flags`.
/** The node is a computed. */
export const COMPUTED = 1;
/** A source changed for certain: a computed calculates again, an effect runs again. */
export const DIRTY = 2;
/** A computed source may have changed; its version tells once it is up to date. */
export const PENDING = 4;
/** The computed is running. */
export const RUNNING = 8;
/** A reader's run threw before reading this computed again, so it passes its next change on even while dirty. */
export const MISSED = 16;
/** The computed's last result is an error. */
export const ERROR = 32;
/** The effect is stopped. */
const STOPPED = 64;
/** The source is a selector key, which leaves its selector when it loses its last subscriber. */
export const FORGETS = 128;

/**
 * A source: a state, a computed or a selector key. `forget` drops a key from its selector.
 * @typedef {{ flags: number, subs: Edge | undefined, subsTail: Edge | undefined, version: number, forget?(): void }} Source
 */
/**
 * What reads sources: an effect or a computed. `_update` recalculates a computed; `phase` is the queue of an effect.
 * @typedef {Source & Owner & { deps: Edge | undefined, depsTail: Edge | undefined, phase: 0 | 1 | 2 | 3, _update(): void }} Reader
 */
/** @typedef {{ owned: (() => void)[] | undefined }} Owner */

/** A dependency of `sub` on `dep`, in the subscribers of `dep` and in the sources of `sub`, each in read order. */
export class Edge {
  /**
   * @param {Source} dep
   * @param {Reader} sub
   * @param {Edge | undefined} nextDep
   * @param {Edge | undefined} prevSub
   */
  constructor(dep, sub, nextDep, prevSub) {
    /** The version of `dep` that `sub` read last. */
    this.version = 0;
    /** The run that read `dep` through this edge last. */
    this.cycle = cycle;
    this.dep = dep;
    this.sub = sub;
    this.nextDep = nextDep;
    this.prevSub = prevSub;
    /** @type {Edge | undefined} */
    this.nextSub = undefined;
  }
}

/** @type {Reader | null} */
export let current = null;

/** @type {Owner | null} */
export let owner = null;

/** Numbers effects in creation order, so a parent runs before the effects it created. */
let nextId = 0;

/** Numbers runs, so a source read twice in one run is linked once. Edges a run that threw kept unread get cycle 0. */
let cycles = 0;
/** The number of the running run. */
let cycle = 0;

/**
 * The work stack of the graph walks, kept across walks so a walk allocates nothing. A walk starts at the current top,
 * so a walk that starts inside another one leaves the outer entries alone.
 * @type {unknown[]}
 */
const stack = [];
let top = 0;

/**
 * Records that `sub` read `dep` in its running run and returns the edge, where the caller stores the version it read.
 * A read in the same order as the last run reuses the edge at the cursor. A source read again in the same run keeps its
 * edge and returns undefined, so the edge keeps the version of the first read: a change between the two reads, made
 * by the run itself, still runs the reader again.
 * @param {Source} dep
 * @param {Reader} sub
 * @returns {Edge | undefined}
 */
export function link(dep, sub) {
  const prevDep = sub.depsTail;
  if (prevDep !== undefined && prevDep.dep === dep) {
    return undefined;
  }
  const nextDep = prevDep !== undefined ? prevDep.nextDep : sub.deps;
  if (nextDep !== undefined && nextDep.dep === dep) {
    nextDep.cycle = cycle;
    sub.depsTail = nextDep;
    return nextDep;
  }
  const prevSub = dep.subsTail;
  if (prevSub !== undefined && prevSub.cycle === cycle && prevSub.sub === sub) {
    return undefined;
  }
  const edge = new Edge(dep, sub, nextDep, prevSub);
  sub.depsTail = edge;
  dep.subsTail = edge;
  if (prevDep !== undefined) {
    prevDep.nextDep = edge;
  } else {
    sub.deps = edge;
  }
  if (prevSub !== undefined) {
    prevSub.nextSub = edge;
  } else {
    dep.subs = edge;
  }
  return edge;
}

/**
 * Removes an edge from the subscribers of its source; a computed left without subscribers lets go of its sources, and
 * a selector key leaves its selector.
 * @param {Edge} edge
 */
function unsubscribe(edge) {
  const dep = removeSub(edge);
  if (dep.subs === undefined && dep.flags & (COMPUTED | FORGETS)) {
    if (dep.flags & COMPUTED) {
      release(/** @type {Reader} */ (dep));
    } else {
      dep.forget?.();
    }
  }
}

/**
 * Removes an edge from the subscribers of its source and returns the source.
 * @param {Edge} edge
 */
function removeSub(edge) {
  const { dep, prevSub, nextSub } = edge;
  if (nextSub !== undefined) {
    nextSub.prevSub = prevSub;
  } else {
    dep.subsTail = prevSub;
  }
  if (prevSub !== undefined) {
    prevSub.nextSub = nextSub;
  } else {
    dep.subs = nextSub;
  }
  return dep;
}

/**
 * Detaches all sources of a reader and returns the first edge of the detached list.
 * @param {Reader} sub
 */
function detach(sub) {
  const edge = sub.deps;
  sub.deps = undefined;
  sub.depsTail = undefined;
  return edge;
}

/**
 * Unsubscribes a reader from all its sources. The list is detached first, so a cleanup that runs meanwhile cannot
 * unlink the same edges again.
 * @param {Reader} sub
 */
function unlinkAll(sub) {
  for (let edge = detach(sub); edge !== undefined; ) {
    const next = edge.nextDep;
    unsubscribe(edge);
    edge = next;
  }
}

/**
 * Unsubscribes a reader from the sources its last run did not read again: the edges after the cursor.
 * @param {Reader} sub
 */
function purge(sub) {
  const tail = sub.depsTail;
  let edge = tail !== undefined ? tail.nextDep : sub.deps;
  if (edge === undefined) {
    return;
  }
  if (tail !== undefined) {
    tail.nextDep = undefined;
  } else {
    sub.deps = undefined;
  }
  do {
    const next = edge.nextDep;
    unsubscribe(edge);
    edge = next;
  } while (edge !== undefined);
}

/**
 * Without subscribers a computed lets go of its sources, so it can be collected and is not visited on every set. The
 * computeds it frees that way go first, deepest first, and then what its run created stops.
 * @param {Reader} computed
 */
export function release(computed) {
  const base = top;
  let node = computed;
  let edge = detach(node);
  for (;;) {
    if (edge !== undefined) {
      const next = edge.nextDep;
      const dep = removeSub(edge);
      if (dep.subs === undefined && dep.flags & COMPUTED) {
        stack[top++] = node;
        stack[top++] = next;
        node = /** @type {Reader} */ (dep);
        edge = detach(node);
      } else {
        if (dep.subs === undefined && dep.flags & FORGETS) {
          dep.forget?.();
        }
        edge = next;
      }
      continue;
    }
    node.flags = (node.flags & ~PENDING) | DIRTY;
    stopOwned(node);
    if (top === base) {
      return;
    }
    edge = /** @type {Edge | undefined} */ (stack[--top]);
    node = /** @type {Reader} */ (stack[--top]);
    stack[top] = stack[top + 1] = undefined;
  }
}

/**
 * Whether a computed passes a change on to its readers: not when it is already dirty or pending, because its readers
 * heard of the change then, unless one of them missed it or the change comes during its own run.
 * @param {number} flags
 */
function passes(flags) {
  return !(flags & (DIRTY | PENDING)) || (flags & (MISSED | RUNNING)) !== 0;
}

/**
 * A source changed for certain: its readers are dirty, and the readers of a computed among them may have changed.
 * @param {Edge} edge the first subscriber edge of the source
 */
export function propagate(edge) {
  /** @type {Edge | undefined} */
  let next = edge;
  do {
    const sub = next.sub;
    const flags = sub.flags;
    sub.flags = (flags & ~MISSED) | DIRTY;
    if (!(flags & COMPUTED)) {
      enqueue(/** @type {Queued & Reader} */ (sub), sub.phase);
    } else if (passes(flags) && sub.subs !== undefined) {
      markPending(sub.subs);
    }
    next = next.nextSub;
  } while (next !== undefined);
  runSync();
}

/**
 * A computed may have changed: its readers check their sources before they run, and the readers of a computed among
 * them may have changed too. A computed that is running counts as dirty, so it does not keep the result of that run.
 * @param {Edge} edge the first subscriber edge of the computed
 */
function markPending(edge) {
  const base = top;
  for (;;) {
    const sub = edge.sub;
    const flags = sub.flags;
    if (!(flags & COMPUTED)) {
      sub.flags = flags | PENDING;
      enqueue(/** @type {Queued & Reader} */ (sub), sub.phase);
    } else if (passes(flags)) {
      sub.flags = (flags & ~MISSED) | (flags & RUNNING ? DIRTY : PENDING);
      if (sub.subs !== undefined) {
        if (edge.nextSub !== undefined) {
          stack[top++] = edge.nextSub;
        }
        edge = sub.subs;
        continue;
      }
    }
    if (edge.nextSub !== undefined) {
      edge = edge.nextSub;
      continue;
    }
    if (top === base) {
      return;
    }
    edge = /** @type {Edge} */ (stack[--top]);
    stack[top] = undefined;
  }
}

/**
 * Whether a source of `node` changed since `node` read it. Walks the sources in read order and stops at the first one
 * whose version is not the one on its edge. A dirty or pending computed among them is checked the same way before its
 * version is compared, so computeds are brought up to date deepest first, without recursion; the sources before the
 * first change are the ones the next run reads first, so nothing outside the branch that run takes is calculated.
 * @param {Reader} node
 */
export function checkDirty(node) {
  const base = top;
  let sub = node;
  let edge = node.deps;
  let dirty = false;
  for (;;) {
    if (edge !== undefined && !dirty) {
      const dep = edge.dep;
      const flags = dep.flags;
      if (flags & COMPUTED && flags & (DIRTY | PENDING)) {
        // The last run threw before reading this source: it may have changed, and the next run reads it if it gets
        // that far, so it is not calculated here.
        if (edge.cycle === 0) {
          dirty = true;
          continue;
        }
        stack[top++] = edge;
        sub = /** @type {Reader} */ (dep);
        edge = sub.deps;
        continue;
      }
      if (dep.version !== edge.version) {
        dirty = true;
      } else {
        edge = edge.nextDep;
      }
      continue;
    }
    if (top === base) {
      return dirty;
    }
    if (dirty || sub.flags & DIRTY) {
      sub._update();
    } else {
      sub.flags &= ~PENDING;
    }
    edge = /** @type {Edge} */ (stack[--top]);
    stack[top] = undefined;
    sub = edge.sub;
    dirty = edge.dep.version !== edge.version;
    if (!dirty) {
      edge = edge.nextDep;
    }
  }
}

/**
 * @template T
 * @param {Reader | null} computation
 * @param {Owner | null} nextOwner
 * @param {() => T} fn
 * @returns {T}
 */
export function runIn(computation, nextOwner, fn) {
  const previous = current;
  const previousOwner = owner;
  current = computation;
  owner = nextOwner;
  try {
    return fn();
  } finally {
    current = previous;
    owner = previousOwner;
  }
}

/**
 * Runs `fn` for a reader, then unsubscribes it from the sources this run no longer read, so a source that is read
 * again, a computed in particular, keeps its subscription and its cached value.
 * @template T
 * @param {Reader} node
 * @param {Owner | null} nextOwner
 * @param {() => T} fn
 * @returns {T}
 */
export function runTracked(node, nextOwner, fn) {
  const previous = current;
  const previousOwner = owner;
  const previousCycle = cycle;
  current = node;
  owner = nextOwner;
  cycle = ++cycles;
  node.depsTail = undefined;
  /** @type {T} */
  let result;
  try {
    result = fn();
  } catch (error) {
    // A run that threw may have stopped before reading its sources; it keeps following them, and a computed among
    // them that is still dirty passes its next change on, so the next change runs it again.
    for (let edge = node.depsTail !== undefined ? node.depsTail.nextDep : node.deps; edge; edge = edge.nextDep) {
      edge.dep.flags |= MISSED;
      edge.cycle = 0;
    }
    throw error;
  } finally {
    current = previous;
    owner = previousOwner;
    cycle = previousCycle;
  }
  purge(node);
  return result;
}

/**
 * Gives `stop` to the current owner, which calls it when it stops.
 * @param {() => void} stop
 */
export function adopt(stop) {
  if (owner !== null) {
    (owner.owned ??= []).push(stop);
  }
}

/**
 * Stops what an owner created, in the order it was created, and empties the owner.
 * @param {Owner} scope
 */
export function stopOwned(scope) {
  const owned = scope.owned;
  if (owned !== undefined) {
    scope.owned = undefined;
    for (const stop of owned) {
      stop();
    }
  }
}

/**
 * Runs `fn` with a new owner, outside any tracking, and returns its value with the function that stops what it
 * created. If `fn` throws, what it created is stopped.
 * @template T
 * @param {() => T} fn
 * @returns {{ value: T, stop: () => void }}
 */
export function own(fn) {
  /** @type {Owner} */
  const scope = { owned: undefined };
  const stop = () => stopOwned(scope);
  try {
    return { value: runIn(null, scope, fn), stop };
  } catch (error) {
    stop();
    throw error;
  }
}

/**
 * An effect or a binding. It has the fields of a computed in the same order, so the graph walks see one shape, and it
 * is the owner of what its run creates.
 */
class Effect {
  /**
   * @param {() => unknown} fn
   * @param {0 | 1 | 2 | 3} phase
   */
  constructor(fn, phase) {
    this.flags = 0;
    /** @type {Edge | undefined} */
    this.deps = undefined;
    /** @type {Edge | undefined} */
    this.depsTail = undefined;
    /** @type {Edge | undefined} */
    this.subs = undefined;
    /** @type {Edge | undefined} */
    this.subsTail = undefined;
    this.version = 0;
    /** @type {(() => void)[] | undefined} */
    this.owned = undefined;
    this._fn = fn;
    /** @type {unknown} The cleanup the last run returned. */
    this._value = undefined;
    this.id = nextId++;
    this.phase = phase;
    this.queued = false;
    this.flush = 0;
    this.runs = 0;
  }

  /** Runs `fn` unless only computeds may have changed and none of them did. */
  run() {
    const flags = this.flags;
    if (flags & STOPPED) {
      return;
    }
    if (!(flags & DIRTY) && flags & PENDING && !checkDirty(this)) {
      this.flags &= ~PENDING;
      return;
    }
    // The check recalculates computeds, and one of them may own this effect and stop it.
    if (this.flags & STOPPED) {
      return;
    }
    this.flags &= ~(DIRTY | PENDING);
    this.reset();
    enterRun();
    try {
      const result = runTracked(this, this, this._fn);
      this._value = typeof result === 'function' ? result : undefined;
    } catch (error) {
      fail(error);
      this.flags |= STOPPED;
    } finally {
      exitRun();
    }
    // Stopped by its error or during its own run: undo what the run set up.
    if (this.flags & STOPPED) {
      this.stop();
    }
  }

  /**
   * Stops the effects created by the last run and calls its cleanup, keeping the subscriptions. A cleanup that
   * throws does not keep this effect from running; its error is thrown like an error of the run.
   */
  reset() {
    stopOwned(this);
    const done = /** @type {(() => void) | undefined} */ (this._value);
    this._value = undefined;
    try {
      done?.();
    } catch (error) {
      fail(error);
    }
  }

  stop() {
    this.flags |= STOPPED;
    this.queued = false;
    this.reset();
    unlinkAll(this);
  }
}

/**
 * Runs `fn` now and again in the next flush after a signal it read changed; returns a function that stops it.
 * `fn` may return a cleanup function, called before the next run and when stopped.
 * If a run throws, the effect is stopped and the error is thrown at the end of the flush.
 * @param {() => void | (() => void)} fn
 * @returns {() => void}
 */
export function effect(fn) {
  return createEffect(fn, 1);
}

/**
 * Like `effect`, but its runs come before the effects and bindings of a flush.
 * @param {() => void | (() => void)} fn
 * @returns {() => void}
 */
effect.pre = (fn) => createEffect(fn, 0);

/**
 * Like `effect`, but its runs come after the effects and bindings of a flush, and its first run waits for the next
 * flush, so the elements built with it are in the document by then.
 * @param {() => void | (() => void)} fn
 * @returns {() => void}
 */
effect.post = (fn) => createEffect(fn, 2);

/**
 * Creates an effect that belongs to the current owner and returns its stop function. Phase 3 runs right after each
 * write that reaches it, for selectors.
 * @param {() => void | (() => void)} fn
 * @param {0 | 1 | 2 | 3} phase
 * @returns {() => void}
 */
export function createEffect(fn, phase) {
  const node = new Effect(fn, phase);
  const stop = () => node.stop();
  adopt(stop);
  if (phase === 2) {
    node.flags = DIRTY;
    enqueue(node, phase);
  } else {
    node.run();
  }
  return stop;
}

/**
 * Runs `fn` now and again after a signal it read changed, like `effect`, but owned by no one: the caller stops the
 * returned effect.
 * @param {() => unknown} fn
 */
export function bind(fn) {
  const node = new Effect(fn, 1);
  node.run();
  return node;
}

/**
 * Runs `fn` when the current owner stops: a root, a branch, a list row, or the next run of an effect. With no owner it
 * never runs. A cleanup that throws does not keep the others from running; its error is thrown at the end of the flush.
 * @param {() => void} fn
 */
export function onCleanup(fn) {
  adopt(() => {
    try {
      fn();
    } catch (error) {
      fail(error);
    }
  });
}

/**
 * Runs `fn` with a new owner and returns a function that stops what `fn` created: effects, bindings, computeds and
 * lists. Reads in `fn` do not subscribe. A root belongs to no other owner, also when it is created inside one, so it
 * lives until its function is called. If `fn` throws, what it created is stopped.
 * @param {() => void} fn
 * @returns {() => void}
 */
export function root(fn) {
  return own(fn).stop;
}

/**
 * Runs `fn` without subscribing to the signals it reads. What it creates belongs to the current owner, as it would
 * outside `untrack`.
 * @template T
 * @param {() => T} fn
 * @returns {T}
 */
export function untrack(fn) {
  return runIn(null, owner, fn);
}

