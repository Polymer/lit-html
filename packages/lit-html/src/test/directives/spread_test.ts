/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {html, render} from '../../lit-html.js';
import {spread} from '../../directives/spread.js';
import {assert} from '@esm-bundle/chai';

suite('spread', () => {
  let container: HTMLDivElement;

  setup(() => {
    container = document.createElement('div');
  });

  test('adds and updates attributes and properties', () => {
    const go = (attributes: {}) =>
      render(html`<div ${spread(attributes)}></div>}`, container);

    go({foo: 'bar', '.prop': 42});
    const el = container.firstElementChild as HTMLElement;
    assert.equal(el.getAttribute('foo'), 'bar');
    assert.equal((el as any).prop, 42);

    go({foo: 'baz', '.prop': 99});
    assert.equal(el.getAttribute('foo'), 'baz');
    assert.equal((el as any).prop, 99);

    go({bar: 'baz'});
    assert.equal(el.hasAttribute('foo'), false);
    assert.equal((el as any).prop, undefined);
    assert.equal(el.getAttribute('bar'), 'baz');
  });

  test('adds and updates event listeners', () => {
    const go = (attributes: {}) =>
      render(html`<div ${spread(attributes)}></div>}`, container);
    let eventCount = 0;
    let eventValue = '';

    go({
      '@click': () => {
        eventValue = 'clicked';
        eventCount++;
      },
    });
    const el = container.firstElementChild as HTMLElement;
    el.click();
    assert.equal(eventValue, 'clicked');
    assert.equal(eventCount, 1);

    go({
      '@click': () => {
        eventValue = 'clicked-2';
        eventCount++;
      },
    });
    el.click();
    // ensure new listener is called
    assert.equal(eventValue, 'clicked-2');
    // ensure previous listener wasn't
    assert.equal(eventCount, 2);
  });
});
