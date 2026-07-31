'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const extrasSource = fs.readFileSync(
  path.join(root, 'shared/tool-extras.js'),
  'utf8'
);
const appSource = fs.readFileSync(path.join(root, 'mediakit/app.js'), 'utf8');

function createElement(tagName = 'div') {
  const listeners = {};
  return {
    tagName: tagName.toUpperCase(),
    value: '',
    textContent: '',
    hidden: false,
    disabled: false,
    href: '',
    style: {},
    children: [],
    classList: {
      toggle() {}
    },
    addEventListener(type, listener) {
      listeners[type] = listener;
    },
    dispatchEvent(event) {
      if (listeners[event.type]) listeners[event.type](event);
    },
    replaceChildren(...children) {
      this.children = children;
    },
    setAttribute() {},
    select() {}
  };
}

function createFixture() {
  const elements = new Map();
  const ids = [
    'mediakit-form',
    'kit-out',
    'affiliate-cta',
    'pub-name',
    'tagline',
    'niche',
    'contact',
    'list-size',
    'open-rate',
    'rate-primary',
    'rate-secondary',
    'placements',
    'mk-error',
    'kit-name',
    'kit-tag',
    'kit-list',
    'kit-open',
    'kit-niche',
    'kit-primary',
    'kit-band',
    'kit-cpm',
    'kit-secondary',
    'kit-contact',
    'kit-placements',
    'affiliate-link',
    'copy-rates',
    'print-kit'
  ];
  ids.forEach(id => elements.set(id, createElement()));

  const appended = [];
  let fallbackCopiedText = '';
  const document = {
    body: {
      appendChild(element) {
        appended.push(element);
      },
      removeChild(element) {
        const index = appended.indexOf(element);
        if (index >= 0) appended.splice(index, 1);
      }
    },
    addEventListener() {},
    createElement,
    execCommand(command) {
      assert.strictEqual(command, 'copy');
      fallbackCopiedText = appended.at(-1).value;
      return true;
    },
    getElementById(id) {
      return elements.get(id);
    }
  };

  elements.get('kit-out').hidden = true;
  elements.get('affiliate-cta').hidden = true;
  elements.get('pub-name').value = 'Mangrove Test';
  elements.get('tagline').value = 'Calm analytics for operators';
  elements.get('niche').value = 'Analytics';
  elements.get('list-size').value = '10000';
  elements.get('open-rate').value = '42';
  elements.get('rate-primary').value = '450';
  elements.get('rate-secondary').value = '150';
  elements.get('placements').value = '';

  const navigator = {
    clipboard: {
      writeText() {
        return Promise.reject(new Error('clipboard permission denied'));
      }
    }
  };
  const window = {
    MediaKitConfig: {},
    clearTimeout() {},
    document,
    location: {
      href: 'https://mangrovetools.com/mediakit/',
      pathname: '/mediakit/'
    },
    matchMedia() {
      return { matches: false };
    },
    navigator,
    print() {},
    requestAnimationFrame(callback) {
      callback();
    },
    setTimeout() {
      return 1;
    }
  };
  const context = {
    Intl,
    URL,
    document,
    isFinite,
    navigator,
    parseFloat,
    window
  };
  vm.createContext(context);
  vm.runInContext(extrasSource, context);
  vm.runInContext(appSource, context);

  return {
    document,
    get fallbackCopiedText() {
      return fallbackCopiedText;
    }
  };
}

test('Media Kit copy falls back and reports success after a valid composition', async () => {
  const fixture = createFixture();
  const form = fixture.document.getElementById('mediakit-form');
  const copyButton = fixture.document.getElementById('copy-rates');

  assert.strictEqual(copyButton.disabled, true);

  form.dispatchEvent({
    type: 'submit',
    preventDefault() {}
  });
  assert.strictEqual(copyButton.disabled, false);

  copyButton.dispatchEvent({ type: 'click' });
  await Promise.resolve();
  await Promise.resolve();

  assert.strictEqual(copyButton.textContent, 'Copied ✓');
  assert.strictEqual(
    fixture.fallbackCopiedText,
    [
      'Mangrove Test media kit',
      'Primary: $450',
      'Band: $383 – $518',
      '$107.14 implied CPM'
    ].join('\n')
  );
});
