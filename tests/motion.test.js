'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('shared/motion.js', 'utf8');

function makeClassList() {
  const values = new Set();
  return {
    add(value) {
      values.add(value);
    },
    remove(value) {
      values.delete(value);
    },
    contains(value) {
      return values.has(value);
    }
  };
}

function makeElement(dataset = {}) {
  const listeners = {};
  const element = {
    dataset: {},
    classList: makeClassList(),
    addEventListener(name, handler) {
      listeners[name] = listeners[name] || [];
      listeners[name].push(handler);
    },
    dispatch(name, event = {}) {
      const normalizedEvent = {
        currentTarget: element,
        key: '',
        preventDefault() {},
        ...event
      };
      (listeners[name] || []).forEach((handler) => handler(normalizedEvent));
    }
  };
  Object.assign(element.dataset, dataset);
  return element;
}

function makeInteractiveInstrument() {
  const targets = {
    observation: makeElement({ instrumentFocus: 'observation' }),
    bound: makeElement({ instrumentFocus: 'bound' }),
    recheck: makeElement({ instrumentFocus: 'recheck' })
  };
  const instrument = makeElement();
  instrument.querySelectorAll = (selector) => {
    assert.strictEqual(selector, '[data-instrument-focus]');
    return Object.values(targets);
  };
  return { instrument, targets };
}

function loadMotion({
  reduce = false,
  withObserver = true,
  withFrames = true,
  observeThrows = false
} = {}) {
  const frames = [];
  const observerInstances = [];
  const documentListeners = {};
  const document = {
    readyState: 'loading',
    querySelector() {
      return null;
    },
    addEventListener(name, handler) {
      documentListeners[name] = handler;
    }
  };
  const root = {
    document,
    matchMedia() {
      return { matches: reduce };
    }
  };

  if (withFrames) {
    root.requestAnimationFrame = (handler) => {
      frames.push(handler);
      return frames.length;
    };
  }

  if (withObserver) {
    root.IntersectionObserver = class {
      constructor(callback, options) {
        this.callback = callback;
        this.options = options;
        this.observed = [];
        this.disconnected = false;
        observerInstances.push(this);
      }

      observe(element) {
        if (observeThrows) throw new Error('observer unavailable');
        this.observed.push(element);
      }

      disconnect() {
        this.disconnected = true;
      }
    };
  }

  const sandbox = { window: root };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);

  return {
    motion: root.MangroveMotion,
    frames,
    observerInstances,
    documentListeners
  };
}

{
  const { motion } = loadMotion();
  assert.strictEqual(typeof motion.initDecisionInstrument, 'function');
  assert.strictEqual(typeof motion.initDecisionStory, 'function');
  assert.strictEqual(typeof motion.revealResult, 'function');
  assert.strictEqual(typeof motion.resetResult, 'function');
}

{
  const instrument = makeElement();
  const { motion, frames } = loadMotion({ reduce: true });

  motion.initDecisionInstrument(instrument);

  assert.strictEqual(instrument.dataset.motion, 'reduced');
  assert.strictEqual(frames.length, 0);
}

{
  const instrument = makeElement();
  const { motion, frames } = loadMotion();

  motion.initDecisionInstrument(instrument);

  assert.strictEqual(instrument.dataset.motion, 'ready');
  assert.strictEqual(frames.length, 1);
  frames.shift()();
  assert.strictEqual(frames.length, 1);
  frames.shift()();
  assert.strictEqual(instrument.dataset.motion, 'active');
}

{
  const { instrument, targets } = makeInteractiveInstrument();
  const { motion } = loadMotion();

  motion.initDecisionInstrument(instrument);

  targets.observation.dispatch('pointerenter');
  assert.strictEqual(instrument.dataset.focusState, 'observation');
  targets.observation.dispatch('pointerleave');
  assert.strictEqual('focusState' in instrument.dataset, false);

  targets.observation.dispatch('click');
  assert.strictEqual(instrument.dataset.focusState, 'observation');
  targets.bound.dispatch('pointerenter');
  assert.strictEqual(instrument.dataset.focusState, 'bound');
  targets.bound.dispatch('pointerleave');
  assert.strictEqual(instrument.dataset.focusState, 'observation');

  targets.recheck.dispatch('click');
  assert.strictEqual(instrument.dataset.focusState, 'recheck');
  targets.bound.dispatch('focus');
  assert.strictEqual(instrument.dataset.focusState, 'bound');
  targets.bound.dispatch('blur');
  assert.strictEqual(instrument.dataset.focusState, 'recheck');

  instrument.dispatch('keydown', { key: 'Escape' });
  assert.strictEqual('focusState' in instrument.dataset, false);
}

{
  const { instrument, targets } = makeInteractiveInstrument();
  const { motion, frames } = loadMotion({ reduce: true });

  motion.initDecisionInstrument(instrument);

  assert.strictEqual(instrument.dataset.motion, 'reduced');
  assert.strictEqual(frames.length, 0);
  targets.bound.dispatch('click');
  assert.strictEqual(instrument.dataset.focusState, 'bound');
}

{
  const instrument = makeElement();
  const { motion } = loadMotion({ withFrames: false });

  motion.initDecisionInstrument(instrument);

  assert.strictEqual(instrument.dataset.motion, 'static');
}

{
  const story = makeElement();
  const { motion, observerInstances } = loadMotion({ reduce: true });

  motion.initDecisionStory(story);

  assert.strictEqual(story.dataset.motion, 'reduced');
  assert.strictEqual(observerInstances.length, 0);
}

{
  const story = makeElement();
  const { motion, observerInstances } = loadMotion();

  motion.initDecisionStory(story);

  assert.strictEqual(story.dataset.motion, 'ready');
  assert.strictEqual(observerInstances.length, 1);
  assert.deepStrictEqual(observerInstances[0].observed, [story]);
  assert.strictEqual(observerInstances[0].options.threshold, 0.2);

  observerInstances[0].callback([{ target: story, isIntersecting: true }]);

  assert.strictEqual(story.dataset.motion, 'active');
  assert.strictEqual(observerInstances[0].disconnected, true);
}

{
  const story = makeElement();
  const { motion, observerInstances } = loadMotion({ withObserver: false });

  motion.initDecisionStory(story);

  assert.strictEqual(story.dataset.motion, 'static');
  assert.strictEqual(observerInstances.length, 0);
}

{
  const story = makeElement();
  const { motion, observerInstances } = loadMotion({ observeThrows: true });

  assert.doesNotThrow(() => motion.initDecisionStory(story));
  assert.strictEqual(story.dataset.motion, 'static');
  assert.strictEqual(observerInstances[0].disconnected, true);
}

{
  const result = makeElement();
  const { motion, frames } = loadMotion();

  motion.revealResult(result);

  assert.strictEqual(result.dataset.resultState, 'updating');
  assert.strictEqual(frames.length, 1);
  frames.shift()();
  assert.strictEqual(frames.length, 1);
  frames.shift()();
  assert.strictEqual(result.dataset.resultState, 'ready');

  motion.resetResult(result);
  assert.strictEqual('resultState' in result.dataset, false);
}

{
  const reducedResult = makeElement();
  const reduced = loadMotion({ reduce: true });
  reduced.motion.revealResult(reducedResult);
  assert.strictEqual(reducedResult.dataset.resultState, 'ready');
  assert.strictEqual(reduced.frames.length, 0);

  const staticResult = makeElement();
  const staticMotion = loadMotion({ withFrames: false });
  staticMotion.motion.revealResult(staticResult);
  assert.strictEqual(staticResult.dataset.resultState, 'ready');
}

{
  const result = makeElement();
  const { motion, frames } = loadMotion();

  motion.revealResult(result);
  const firstOuterFrame = frames.shift();
  motion.revealResult(result);
  const secondOuterFrame = frames.shift();

  firstOuterFrame();
  secondOuterFrame();
  const staleReadyFrame = frames.shift();
  const currentReadyFrame = frames.shift();

  staleReadyFrame();
  assert.strictEqual(result.dataset.resultState, 'updating');
  currentReadyFrame();
  assert.strictEqual(result.dataset.resultState, 'ready');
}

{
  const { motion } = loadMotion();
  assert.doesNotThrow(() => motion.initDecisionInstrument(null));
  assert.doesNotThrow(() => motion.initDecisionStory(null));
  assert.doesNotThrow(() => motion.revealResult(null));
  assert.doesNotThrow(() => motion.resetResult(null));
}

console.log('motion tests passed');
