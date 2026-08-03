'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const pageSource = fs.readFileSync(path.join(root, 'mediakit/index.html'), 'utf8');

class FakeElement {
  constructor(tagName, id) {
    this.tagName = tagName.toUpperCase();
    this.id = id || '';
    this.hidden = false;
    this.disabled = false;
    this.value = '';
    this.children = [];
    this.listeners = {};
    this.attributes = {};
    this.style = {};
    this._textContent = '';
    this.classSet = new Set();
    this.classList = {
      toggle: (className, force) => {
        if (force) this.classSet.add(className);
        else this.classSet.delete(className);
      },
      remove: (className) => this.classSet.delete(className)
    };
  }

  get textContent() {
    return this._textContent + this.children.map((child) => child.textContent).join('');
  }

  set textContent(value) {
    this._textContent = String(value);
    this.children = [];
  }

  addEventListener(type, listener) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(listener);
  }

  trigger(type) {
    const event = { preventDefault() {}, target: this };
    (this.listeners[type] || []).forEach((listener) => listener(event));
  }

  click() {
    if (!this.disabled) this.trigger('click');
  }

  appendChild(child) {
    this.children.push(child);
    child.parentNode = this;
    return child;
  }

  removeChild(child) {
    this.children = this.children.filter((candidate) => candidate !== child);
    child.parentNode = null;
  }

  replaceChildren(...children) {
    this._textContent = '';
    this.children = [];
    children.forEach((child) => this.appendChild(child));
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  select() {}
}

function loadMediaKitApp() {
  const tagsById = {
    'mediakit-form': 'form',
    'kit-out': 'section',
    'affiliate-cta': 'section',
    'mk-error': 'p',
    'pub-name': 'input',
    tagline: 'input',
    niche: 'input',
    contact: 'input',
    'list-size': 'input',
    'open-rate': 'input',
    'rate-primary': 'input',
    'rate-secondary': 'input',
    placements: 'textarea',
    'kit-name': 'h2',
    'kit-tag': 'p',
    'kit-list': 'span',
    'kit-open': 'span',
    'kit-niche': 'span',
    'kit-primary': 'span',
    'kit-band': 'span',
    'kit-cpm': 'span',
    'kit-secondary': 'span',
    'kit-contact': 'span',
    'kit-placements': 'ul',
    'affiliate-link': 'a',
    'copy-rates': 'button',
    'print-kit': 'button'
  };
  const elements = Object.fromEntries(
    Object.entries(tagsById).map(([id, tagName]) => [id, new FakeElement(tagName, id)])
  );
  elements['kit-out'].hidden = true;
  elements['affiliate-cta'].hidden = true;
  elements['mk-error'].hidden = true;
  elements['copy-rates'].textContent = 'Copy rates';
  elements['copy-rates'].disabled = /<button[^>]*id="copy-rates"[^>]*\bdisabled\b/.test(pageSource);

  let copiedText = null;
  const document = {
    body: new FakeElement('body', 'body'),
    addEventListener() {},
    getElementById(id) {
      return elements[id] || null;
    },
    createElement(tagName) {
      return new FakeElement(tagName);
    },
    execCommand(command) {
      const textarea = this.body.children.at(-1);
      if (command === 'copy' && textarea) {
        copiedText = textarea.value;
        return true;
      }
      return false;
    }
  };
  const clipboardWrites = [];
  const window = {
    document,
    navigator: {
      clipboard: {
        writeText(text) {
          clipboardWrites.push(text);
          return {
            then(_onFulfilled, onRejected) {
              return Promise.resolve().then(() => onRejected(new Error('denied')));
            }
          };
        }
      }
    },
    location: { pathname: '/mediakit/', href: 'https://mangrovetools.com/mediakit/' },
    clearTimeout() {},
    setTimeout() { return 1; },
    print() {}
  };
  const context = { window, document, navigator: window.navigator, Intl };
  vm.createContext(context);
  ['shared/tool-extras.js', 'mediakit/app.js'].forEach((relativePath) => {
    vm.runInContext(fs.readFileSync(path.join(root, relativePath), 'utf8'), context);
  });

  return { elements, clipboardWrites, copiedText: () => copiedText };
}

function setValidInputs(elements) {
  elements['pub-name'].value = 'Operator Brief';
  elements.tagline.value = 'Weekly notes for operators';
  elements.niche.value = 'Operations';
  elements['list-size'].value = '12000';
  elements['open-rate'].value = '50';
  elements['rate-primary'].value = '1200';
  elements['rate-secondary'].value = '300';
  elements.contact.value = 'pitch@example.com';
  elements.placements.value = 'Primary sponsorship';
}

test('keeps the Copy rates button unavailable until a valid kit is rendered', () => {
  const { elements } = loadMediaKitApp();

  assert.equal(elements['copy-rates'].disabled, true);

  elements['mediakit-form'].trigger('submit');
  assert.equal(elements['copy-rates'].disabled, true);

  setValidInputs(elements);
  elements['mediakit-form'].trigger('submit');
  assert.equal(elements['copy-rates'].disabled, false);
});

test('copies the rendered rate summary through the shared rejected-clipboard fallback', async () => {
  const fixture = loadMediaKitApp();
  const { elements } = fixture;
  setValidInputs(elements);
  elements['mediakit-form'].trigger('submit');

  elements['copy-rates'].click();
  await Promise.resolve();

  const expectedSummary = [
    'Operator Brief media kit',
    'Primary: $1,200',
    'Band: $1,020 – $1,380',
    '$200.00 implied CPM'
  ].join('\n');
  assert.deepEqual(fixture.clipboardWrites, [expectedSummary]);
  assert.equal(fixture.copiedText(), expectedSummary);
  assert.equal(elements['copy-rates'].textContent, 'Copied ✓');
});
