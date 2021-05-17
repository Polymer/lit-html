/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
import '../../polyfill-support.js';
import {renderShadowRoot} from '../test-utils/shadow-root.js';
import {html} from '../../lit-html.js';
import {assert} from '@esm-bundle/chai';

const extendedWindow = window as unknown as LitExtraGlobals;

suite('ShadyCSS scoping shim', () => {
  setup(function () {
    if (
      typeof extendedWindow.ShadyDOM === 'undefined' ||
      !extendedWindow.ShadyDOM.inUse ||
      typeof extendedWindow.ShadyCSS === 'undefined' ||
      extendedWindow.ShadyCSS.nativeShadow ||
      extendedWindow.ShadyCSS.ScopingShim === undefined
    ) {
      this.skip();
      return;
    }
  });

  test('scoped styles are applied for non-TemplateResult values', function () {
    const container = document.createElement('scope-1');
    extendedWindow.ShadyCSS!.ScopingShim!.prepareAdoptedCssText(
      [':host { border-top: 2px solid black; }'],
      'scope-1'
    );
    document.body.appendChild(container);
    renderShadowRoot(undefined, container);
    assert.equal(
      getComputedStyle(container).getPropertyValue('border-top-width').trim(),
      '2px'
    );
    document.body.removeChild(container);
  });

  test('adopted CSS remains when rendering a TemplateResult after an initial non-TemplateResult', function () {
    const container = document.createElement('scope-2');
    extendedWindow.ShadyCSS!.ScopingShim!.prepareAdoptedCssText(
      [':host { border-top: 2px solid black; } button { font-size: 7px; } '],
      'scope-2'
    );
    document.body.appendChild(container);
    renderShadowRoot(undefined, container);
    assert.equal(
      getComputedStyle(container).getPropertyValue('border-top-width').trim(),
      '2px'
    );
    renderShadowRoot(html`<button>This is a button.</button>`, container);
    assert.equal(
      getComputedStyle(container).getPropertyValue('border-top-width').trim(),
      '2px'
    );
    assert.equal(
      getComputedStyle(container.shadowRoot!.querySelector('button')!)
        .getPropertyValue('font-size')
        .trim(),
      '7px'
    );
    document.body.removeChild(container);
  });

  // TODO(sorvell): No longer supported. Only styles in TemplateResults are
  // identified.
  test.skip('Styles inserted in the initial render through ChildParts are scoped.', function () {
    const style = document.createElement('style');
    style.innerHTML =
      ':host { border-top: 2px solid black; } button { font-size: 7px; }';
    const container = document.createElement('scope-3');
    document.body.appendChild(container);
    renderShadowRoot(
      html`${style}<button>This is a button.</button>`,
      container
    );
    assert.equal(
      getComputedStyle(container).getPropertyValue('border-top-width').trim(),
      '2px'
    );
    assert.equal(
      getComputedStyle(container.shadowRoot!.querySelector('button')!)
        .getPropertyValue('font-size')
        .trim(),
      '7px'
    );
    document.body.removeChild(container);
  });
});
