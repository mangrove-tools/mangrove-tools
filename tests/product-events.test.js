'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const calls = [];
let clickHandler = null;
const document = {
  _mangroveProductLinkTracking: false,
  addEventListener(type, handler) {
    if (type === 'click') clickHandler = handler;
  }
};
const window = {
  document,
  location: {
    pathname: '/letterroi/',
    href: 'https://mangrovetools.com/letterroi/'
  },
  gtag(...args) {
    calls.push(args);
  }
};
const sandbox = { window, URL };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('shared/tool-extras.js', 'utf8'), sandbox);

function anchor(href, classes = '', rel = '') {
  return {
    getAttribute(name) {
      if (name === 'href') return href;
      return '';
    },
    matches(selector) {
      if (selector === 'a.analytics-cta') {
        return classes.split(/\s+/).includes('analytics-cta');
      }
      if (selector === 'a[rel~="sponsored"]') {
        return rel.split(/\s+/).includes('sponsored');
      }
      return false;
    }
  };
}

function click(targetAnchor) {
  clickHandler({
    target: {
      closest(selector) {
        return selector === 'a' ? targetAnchor : null;
      }
    }
  });
}

click(anchor('/analytics/budget/'));
assert.strictEqual(calls.length, 0, 'navigation links are not result CTA events');

click(anchor('/analytics/budget/', 'analytics-cta'));
assert.strictEqual(calls.length, 1);
assert.strictEqual(calls[0][1], 'analytics_cta_clicked');
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(calls[0][2])),
  {
    route: '/letterroi/',
    tool: 'LetterROI',
    action: 'click',
    destination: '/analytics/budget/',
    link: 'analytics_cta'
  }
);

window.MangroveToolExtras.trackProductEvent('calculation_completed', {
  route: '/attacker-controlled/',
  tool: 'private form text',
  action: 'submit',
  userInput: 'must never leave the browser'
});
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(calls[1][2])),
  {
    route: '/letterroi/',
    tool: 'LetterROI',
    action: 'submit'
  }
);
