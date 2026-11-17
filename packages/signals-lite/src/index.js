import { LIVE } from 'fiorejs';

// Kinds and states of a node, as bits of `flags`.
const STATE = 1;
const COMPUTED = 2;
const EFFECT = 4;
const BINDING = 8;
const ROOT = 16;
/** A source changed for certain. */
const DIRTY = 32;
/** A computed source may have changed; checked before the node runs. */
const PENDING = 64;
const QUEUED = 128;
const RUNNING = 256;
const DISPOSED = 512;
/** The mark of a list row, flipped on every pass; a row with the old mark is gone. */
const PASS = 1024;
const KIND = STATE | COMPUTED | EFFECT | BINDING | ROOT | PASS;

/** The value of a binding before its first run, so the first value is always applied. */
const UNSET = {};

/** A dependency edge, in two lists at once: the subscribers of `dep` and the dependencies of `sub`. */
class Link {
  constructor(version, dep, sub, prevDep, nextDep, prevSub) {
    this.version = version;
    this.dep = dep;
    this.sub = sub;
    this.prevDep = prevDep;
    this.nextDep = nextDep;
    this.prevSub = prevSub;
    this.nextSub = undefined;
  }
}

/**
 * Every state, computed, effect, binding, root and list row is a Node with the same fields in the same order, so
 * the graph walks see one object shape. `fn` is the computation, the apply function of a binding, or the hook a
 * state calls when it loses its last subscriber.
 */
class Node {
  constructor(flags, value, fn) {
    this.flags = flags;
    this.value = value;
    this.fn = fn;
    this.src = undefined;
    this.key = undefined;
    this.deps = undefined;
    this.depsTail = undefined;
    this.subs = undefined;
    this.subsTail = undefined;
    this.owner = undefined;
    this.first = undefined;
    this.prev = undefined;
    this.next = undefined;
    this.cleanup = undefined;
  }

  /** Reads the value; inside an effect, computed or binding it also subscribes. */
  get() {
    const flags = this.flags;
    if (
      flags & COMPUTED &&
      (flags & DIRTY || (flags & PENDING && (checkDirty(this.deps, this) || ((this.flags = flags & ~PENDING), false))))
    ) {
      if (updateComputed(this) && this.subs !== undefined) {
        shallowPropagate(this.subs);
      }
    }
    const sub = activeSub;
    if (sub !== undefined) {
      link(this, sub);
      // The run wrote one of its own sources, so the value just read is already old: the reader runs again.
      if (this.flags & DIRTY) {
        sub.flags |= DIRTY;
        if (sub.flags & (EFFECT | BINDING) && !(sub.flags & QUEUED)) {
          enqueue(sub);
        }
      }
    }
    return this.value;
  }

  /** Sets the value of a state; readers update in the next flush. */
  set(value) {
    if (!Object.is(this.value, value)) {
      this.value = value;
      if (this.subs !== undefined) {
        propagate(this.subs);
      }
    }
  }

  /** Binds the value to a property, an attribute or a child of a fiorejs element. */
  [LIVE](apply) {
    const binding = new Node(BINDING, UNSET, apply);
    binding.src = this;
    adopt(binding);
    execute(binding);
  }
}

/** The node whose run is reading: reads link to it. */
let activeSub;
/** The node that owns what is created now: effects, bindings, list rows. */
let owner;
/** Numbers runs, so a dependency read twice in one run links once. */
let cycle = 0;

// Work stacks of the graph walks, kept across calls so a walk allocates nothing once they have grown. Each walk
// starts at the current top, so a walk that starts inside another one leaves the outer entries alone.
const propagateStack = [];
let propagateTop = 0;
const checkStack = [];
let checkTop = 0;
const disposeStack = [];
let disposeTop = 0;
/** Computeds that lost their last subscriber and still hold their dependencies. */
const unwatchedStack = [];
let unwatchedTop = 0;

const queue = [];
let queued = 0;
let scheduled = false;
let flushing = false;

function link(dep, sub) {
  const prevDep = sub.depsTail;
  if (prevDep !== undefined && prevDep.dep === dep) {
    return;
  }
  const nextDep = prevDep !== undefined ? prevDep.nextDep : sub.deps;
  // Read in the same order as the last run: the old link is reused.
  if (nextDep !== undefined && nextDep.dep === dep) {
    nextDep.version = cycle;
    sub.depsTail = nextDep;
    return;
  }
  const prevSub = dep.subsTail;
  if (prevSub !== undefined && prevSub.version === cycle && prevSub.sub === sub) {
    return;
  }
  const edge = new Link(cycle, dep, sub, prevDep, nextDep, prevSub);
  sub.depsTail = edge;
  dep.subsTail = edge;
  if (nextDep !== undefined) {
    nextDep.prevDep = edge;
  }
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
}

/** Removes an edge from both lists and returns the next dependency of its subscriber. */
function unlink(edge, sub) {
  const { dep, prevDep, nextDep, prevSub, nextSub } = edge;
  if (nextDep !== undefined) {
    nextDep.prevDep = prevDep;
  } else {
    sub.depsTail = prevDep;
  }
  if (prevDep !== undefined) {
    prevDep.nextDep = nextDep;
  } else {
    sub.deps = nextDep;
  }
  if (nextSub !== undefined) {
    nextSub.prevSub = prevSub;
  } else {
    dep.subsTail = prevSub;
  }
  if (prevSub !== undefined) {
    prevSub.nextSub = nextSub;
  } else if ((dep.subs = nextSub) === undefined) {
    if (dep.flags & COMPUTED) {
      unwatchedStack[unwatchedTop++] = dep;
    } else if (dep.fn !== undefined) {
      dep.fn(dep);
    }
  }
  return nextDep;
}

/** Unlinks the dependencies the last run did not read again. */
function purgeDeps(sub) {
  let edge = sub.depsTail !== undefined ? sub.depsTail.nextDep : sub.deps;
  while (edge !== undefined) {
    edge = unlink(edge, sub);
  }
  if (unwatchedTop > 0) {
    releaseUnwatched();
  }
}

function unlinkAll(sub) {
  let edge = sub.depsTail;
  while (edge !== undefined) {
    const prev = edge.prevDep;
    unlink(edge, sub);
    edge = prev;
  }
}

/** A computed without subscribers lets go of its dependencies, which can free more computeds in turn. */
function releaseUnwatched() {
  while (unwatchedTop > 0) {
    const computed = unwatchedStack[--unwatchedTop];
    unwatchedStack[unwatchedTop] = undefined;
    if (computed.subs === undefined && computed.deps !== undefined) {
      computed.flags = COMPUTED | DIRTY;
      unlinkAll(computed);
    }
  }
}

/** A state changed: its readers are dirty, and the readers of a dirty computed may be. */
function propagate(edge) {
  do {
    const sub = edge.sub;
    const flags = sub.flags;
    if (!(flags & DIRTY)) {
      sub.flags = flags | DIRTY;
      if (flags & COMPUTED) {
        if (!(flags & PENDING) && sub.subs !== undefined) {
          markPending(sub.subs);
        }
      } else if (!(flags & QUEUED)) {
        enqueue(sub);
      }
    }
    edge = edge.nextSub;
  } while (edge !== undefined);
}

function markPending(edge) {
  const base = propagateTop;
  for (;;) {
    const sub = edge.sub;
    const flags = sub.flags;
    if (!(flags & (DIRTY | PENDING))) {
      sub.flags = flags | PENDING;
      if (flags & COMPUTED) {
        if (sub.subs !== undefined) {
          if (edge.nextSub !== undefined) {
            propagateStack[propagateTop++] = edge.nextSub;
          }
          edge = sub.subs;
          continue;
        }
      } else if (!(flags & QUEUED)) {
        enqueue(sub);
      }
    }
    if (edge.nextSub !== undefined) {
      edge = edge.nextSub;
      continue;
    }
    if (propagateTop === base) {
      return;
    }
    edge = propagateStack[--propagateTop];
    propagateStack[propagateTop] = undefined;
  }
}

/** A computed recalculated to a new value: its pending readers are now dirty. */
function shallowPropagate(edge) {
  do {
    const sub = edge.sub;
    const flags = sub.flags;
    if ((flags & (PENDING | DIRTY)) === PENDING) {
      sub.flags = flags | DIRTY;
      if (flags & (EFFECT | BINDING) && !(flags & QUEUED)) {
        enqueue(sub);
      }
    }
    edge = edge.nextSub;
  } while (edge !== undefined);
}

/**
 * Brings the computed dependencies of a pending node up to date, deepest first, and returns whether one of them
 * changed.
 */
function checkDirty(edge, sub) {
  const base = checkTop;
  let dirty = false;
  top: for (;;) {
    const dep = edge.dep;
    const flags = dep.flags;
    if (sub.flags & DIRTY) {
      dirty = true;
    } else if ((flags & (COMPUTED | DIRTY)) === (COMPUTED | DIRTY)) {
      if (updateComputed(dep)) {
        if (dep.subs.nextSub !== undefined) {
          shallowPropagate(dep.subs);
        }
        dirty = true;
      }
    } else if ((flags & (COMPUTED | PENDING)) === (COMPUTED | PENDING)) {
      checkStack[checkTop++] = edge;
      edge = dep.deps;
      sub = dep;
      continue;
    }
    if (!dirty && edge.nextDep !== undefined) {
      edge = edge.nextDep;
      continue;
    }
    while (checkTop > base) {
      edge = checkStack[--checkTop];
      checkStack[checkTop] = undefined;
      if (dirty) {
        if (updateComputed(sub)) {
          if (sub.subs.nextSub !== undefined) {
            shallowPropagate(sub.subs);
          }
          sub = edge.sub;
          continue;
        }
        dirty = false;
      } else {
        sub.flags &= ~PENDING;
      }
      sub = edge.sub;
      if (edge.nextDep !== undefined) {
        edge = edge.nextDep;
        continue top;
      }
    }
    return dirty;
  }
}

/** Recalculates a computed and returns whether its value changed. */
function updateComputed(computed) {
  const prevSub = activeSub;
  const old = computed.value;
  activeSub = computed;
  computed.depsTail = undefined;
  // Cleared before the run, so a write to one of its sources during the run leaves it dirty.
  computed.flags = COMPUTED | RUNNING;
  ++cycle;
  try {
    computed.value = computed.fn(old);
  } catch (error) {
    computed.flags |= DIRTY;
    throw error;
  } finally {
    activeSub = prevSub;
    computed.flags &= ~RUNNING;
    purgeDeps(computed);
  }
  return !Object.is(old, computed.value);
}

/** Runs an effect or a binding: stops what its last run created, calls its cleanup, then runs it tracked. */
function execute(node) {
  if (node.first !== undefined) {
    const first = node.first;
    node.first = undefined;
    disposeFrom(first);
  }
  if (node.cleanup !== undefined) {
    runCleanup(node);
  }
  const prevSub = activeSub;
  const prevOwner = owner;
  activeSub = node;
  owner = node;
  node.depsTail = undefined;
  node.flags = (node.flags & KIND) | RUNNING;
  ++cycle;
  let value;
  try {
    if (node.flags & BINDING) {
      value = node.src.get();
    } else {
      value = node.fn();
    }
  } finally {
    activeSub = prevSub;
    owner = prevOwner;
    node.flags &= ~RUNNING;
    purgeDeps(node);
  }
  if (node.flags & BINDING) {
    if (!Object.is(value, node.value)) {
      node.value = value;
      node.fn(value);
    }
  } else if (typeof value === 'function') {
    node.cleanup = value;
  }
}

function run(node) {
  const flags = node.flags;
  if (flags & DIRTY || (flags & PENDING && checkDirty(node.deps, node))) {
    execute(node);
  } else {
    node.flags = flags & ~PENDING;
  }
}

function enqueue(node) {
  node.flags |= QUEUED;
  queue[queued++] = node;
  if (!scheduled) {
    scheduled = true;
    queueMicrotask(flush);
  }
}

/**
 * Runs the effects and bindings waiting for the next microtask now. Effects queued during the flush run in it too.
 * An error is reported and does not stop the others.
 */
export function flush() {
  if (flushing) {
    return;
  }
  flushing = true;
  for (let i = 0; i < queued; i++) {
    const node = queue[i];
    queue[i] = undefined;
    node.flags &= ~QUEUED;
    if (node.flags & DISPOSED) {
      continue;
    }
    try {
      run(node);
    } catch (error) {
      report(error);
    }
  }
  queued = 0;
  scheduled = false;
  flushing = false;
}

function report(error) {
  if (typeof reportError === 'function') {
    reportError(error);
  } else {
    console.error(error);
  }
}

function runCleanup(node) {
  const cleanup = node.cleanup;
  node.cleanup = undefined;
  const prevSub = activeSub;
  activeSub = undefined;
  try {
    cleanup();
  } catch (error) {
    report(error);
  } finally {
    activeSub = prevSub;
  }
}

/** Makes the current owner own `node`; disposing the owner disposes it. */
function adopt(node) {
  const parent = owner;
  if (parent !== undefined) {
    node.owner = parent;
    const first = parent.first;
    if (first !== undefined) {
      first.prev = node;
      node.next = first;
    }
    parent.first = node;
  }
}

function dispose(node) {
  if (node.flags & DISPOSED) {
    return;
  }
  const parent = node.owner;
  if (parent !== undefined) {
    if (node.prev !== undefined) {
      node.prev.next = node.next;
    } else {
      parent.first = node.next;
    }
    if (node.next !== undefined) {
      node.next.prev = node.prev;
    }
    node.owner = node.prev = node.next = undefined;
  }
  disposeFrom(node);
}

/** Disposes `node`, the nodes after it in its owner's list and everything they own. */
function disposeFrom(node) {
  const base = disposeTop;
  for (let sibling = node; sibling !== undefined; sibling = sibling.next) {
    disposeStack[disposeTop++] = sibling;
  }
  while (disposeTop > base) {
    const current = disposeStack[--disposeTop];
    disposeStack[disposeTop] = undefined;
    for (let child = current.first; child !== undefined; child = child.next) {
      disposeStack[disposeTop++] = child;
    }
    current.first = undefined;
    current.flags = DISPOSED;
    if (current.cleanup !== undefined) {
      runCleanup(current);
    }
    if (current.deps !== undefined) {
      unlinkAll(current);
    }
  }
  if (unwatchedTop > 0) {
    releaseUnwatched();
  }
}

/**
 * A value that can be read and written.
 * @template T
 * @param {T} value
 */
export function state(value) {
  return new Node(STATE, value, undefined);
}

/**
 * A cached value derived from other signals, recalculated on read after one of them changed. `fn` gets the previous
 * value.
 * @template T
 * @param {(previous: T | undefined) => T} fn
 */
export function computed(fn) {
  return new Node(COMPUTED | DIRTY, undefined, fn);
}

/**
 * Runs `fn` now and again in the flush after a signal it read changed; returns a function that stops it. `fn` may
 * return a cleanup, called before the next run and when stopped.
 * @param {() => void | (() => void)} fn
 */
export function effect(fn) {
  const node = new Node(EFFECT, undefined, fn);
  adopt(node);
  execute(node);
  return () => dispose(node);
}

/**
 * Runs `fn` with a new owner and returns a function that stops what it created. A root belongs to no other owner.
 * @param {() => void} fn
 */
export function root(fn) {
  const node = new Node(ROOT, undefined, undefined);
  const prevOwner = owner;
  const prevSub = activeSub;
  owner = node;
  activeSub = undefined;
  try {
    fn();
  } catch (error) {
    dispose(node);
    throw error;
  } finally {
    owner = prevOwner;
    activeSub = prevSub;
  }
  return () => dispose(node);
}

/**
 * Runs `fn` without subscribing to what it reads.
 * @template T
 * @param {() => T} fn
 */
export function untrack(fn) {
  const prevSub = activeSub;
  activeSub = undefined;
  try {
    return fn();
  } finally {
    activeSub = prevSub;
  }
}

/**
 * Selection in constant time: `select(key)` returns a signal that is `yes` while `source` equals `key` and `no`
 * otherwise. A change of `source` writes only the signals of the old and the new key, whatever the number of keys.
 * @param {{ get(): unknown }} source
 * @param {unknown} [yes]
 * @param {unknown} [no]
 */
export function selector(source, yes = true, no = false) {
  /** @type {Map<unknown, Node>} */
  const nodes = new Map();
  let current = untrack(() => source.get());
  const forget = (/** @type {Node} */ node) => {
    nodes.delete(node.key);
  };
  effect(() => {
    const next = source.get();
    if (Object.is(next, current)) {
      return;
    }
    const before = nodes.get(current);
    current = next;
    before?.set(no);
    nodes.get(next)?.set(yes);
  });
  return (/** @type {unknown} */ key) => {
    let node = nodes.get(key);
    if (node === undefined) {
      node = new Node(STATE, Object.is(key, current) ? yes : no, forget);
      node.key = key;
      nodes.set(key, node);
    }
    return node;
  };
}

/** A keyed list, bound as a child of a fiorejs element. */
class List {
  constructor(source, render, key) {
    this.source = source;
    this.render = render;
    this.key = key;
  }

  [LIVE](apply, context) {
    mount(this, apply, context);
  }
}

/**
 * A list that renders one node per item and keeps the node of an item while its key stays in the list. The key is
 * the item, or what `key` returns; keys are unique.
 * @template T
 * @param {{ get(): readonly T[] }} source
 * @param {(item: T, index: number) => Node} render
 * @param {(item: T) => unknown} [key]
 */
export function list(source, render, key) {
  return new List(source, render, key);
}

function mount(list, apply, context) {
  // The rows have their own owner, so a new pass of the list does not stop them.
  const holder = new Node(ROOT, undefined, undefined);
  adopt(holder);
  /** @type {Map<unknown, Node>} */
  const rows = new Map();
  /** The nodes of the last pass; reused, so a pass allocates no array. */
  const nodes = [];
  // Alone in its element, the list can empty the element in one step.
  const parent = context.kind === 'child' && context.anchor === context.element ? context.element : null;
  let mark = 0;

  const pass = () => {
    const items = list.source.get();
    const length = items.length;
    mark ^= PASS;
    if (length === 0) {
      // Every row goes: the holder's list of rows is dropped whole, without unhooking rows one by one.
      if (holder.first !== undefined) {
        const first = holder.first;
        holder.first = undefined;
        disposeFrom(first);
        rows.clear();
      }
      nodes.length = 0;
      if (parent !== null) {
        parent.textContent = '';
      } else {
        apply(nodes);
      }
      return;
    }
    const render = list.render;
    const key = list.key;
    const prevSub = activeSub;
    const prevOwner = owner;
    activeSub = undefined;
    let created = 0;
    try {
      for (let i = 0; i < length; i++) {
        const item = items[i];
        const id = key === undefined ? item : key(item);
        let row = rows.get(id);
        if (row === undefined) {
          owner = holder;
          row = new Node(ROOT, undefined, undefined);
          adopt(row);
          row.key = id;
          owner = row;
          row.value = render(item, i);
          rows.set(id, row);
          created++;
        }
        row.flags = (row.flags & ~PASS) | mark;
        nodes[i] = row.value;
      }
    } finally {
      activeSub = prevSub;
      owner = prevOwner;
    }
    nodes.length = length;
    if (rows.size > length) {
      for (const row of rows.values()) {
        if ((row.flags & PASS) !== mark) {
          rows.delete(row.key);
          dispose(row);
        }
      }
    }
    // No row was kept: the old nodes go at once instead of one by one.
    if (created === length && parent !== null && parent.firstChild !== null) {
      parent.textContent = '';
    }
    apply(nodes);
  };

  const node = new Node(EFFECT, undefined, pass);
  adopt(node);
  execute(node);
}
