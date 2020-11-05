/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {UpdatingElement} from '../../updating-element.js';
import {eventOptions} from '../../decorators/eventOptions.js';
import {
  canTestUpdatingElement,
  generateElementName,
  RenderingElement,
  html,
} from '../test-helpers.js';
import {assert} from '@esm-bundle/chai';

let hasOptions;
const supportsOptions = (function () {
  if (hasOptions !== undefined) {
    return hasOptions;
  }
  const fn = () => {};
  const event = 'foo';
  hasOptions = false;
  const options = {
    get capture() {
      hasOptions = true;
      return true;
    },
  };
  document.body.addEventListener(event, fn, options);
  document.body.removeEventListener(event, fn, options);
  return hasOptions;
})();

let hasPassive;
const supportsPassive = (function () {
  if (hasPassive !== undefined) {
    return hasPassive;
  }
  // Use an iframe since ShadyDOM will pass this test but doesn't actually
  // enforce passive behavior.
  const f = document.createElement('iframe');
  document.body.appendChild(f);
  const fn = () => {};
  const event = 'foo';
  hasPassive = false;
  const options = {
    get passive() {
      hasPassive = true;
      return true;
    },
  };
  f.contentDocument!.addEventListener(event, fn, options);
  f.contentDocument!.removeEventListener(
    event,
    fn,
    options as AddEventListenerOptions
  );
  document.body.removeChild(f);
  return hasPassive;
})();

let hasOnce;
const supportsOnce = (function () {
  if (hasOnce !== undefined) {
    return hasOnce;
  }
  // Use an iframe since ShadyDOM will pass this test but doesn't actually
  // enforce passive behavior.
  const f = document.createElement('iframe');
  document.body.appendChild(f);
  const fn = () => {};
  const event = 'foo';
  hasOnce = false;
  const options = {
    get once() {
      hasOnce = true;
      return true;
    },
  };
  f.contentDocument!.addEventListener(event, fn, options);
  f.contentDocument!.removeEventListener(
    event,
    fn,
    options as AddEventListenerOptions
  );
  document.body.removeChild(f);
  return hasOnce;
})();

(canTestUpdatingElement ? suite : suite.skip)('@eventOptions', () => {
  let container: HTMLElement;

  setup(() => {
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
  });

  teardown(() => {
    if (container !== undefined) {
      container.parentElement!.removeChild(container);
      (container as any) = undefined;
    }
  });

  test('allows capturing listeners', async function () {
    if (!supportsOptions) {
      this.skip();
    }

    class C extends RenderingElement {
      eventPhase?: number;

      @eventOptions({capture: true})
      onClick(e: Event) {
        this.eventPhase = e.eventPhase;
      }

      render() {
        return html`<div><button></button></div>`;
      }

      firstUpdated() {
        this.renderRoot
          .querySelector('div')!
          .addEventListener(
            'click',
            (e: Event) => this.onClick(e),
            (this.onClick as unknown) as AddEventListenerOptions
          );
      }
    }
    customElements.define(generateElementName(), C);

    const c = new C();
    container.appendChild(c);
    await c.updateComplete;
    c.renderRoot.querySelector('button')!.click();
    assert.equal(c.eventPhase, Event.CAPTURING_PHASE);
  });

  test('allows once listeners', async function () {
    if (!supportsOnce) {
      this.skip();
    }

    class C extends UpdatingElement {
      clicked = 0;

      constructor() {
        super();
        this.addEventListener(
          'click',
          () => this.onClick(),
          (this.onClick as unknown) as AddEventListenerOptions
        );
      }

      @eventOptions({once: true})
      onClick() {
        this.clicked++;
      }
    }
    customElements.define(generateElementName(), C);

    const c = new C();
    container.appendChild(c);
    await c.updateComplete;
    c.click();
    c.click();
    assert.equal(c.clicked, 1);
  });

  test('allows passive listeners', async function () {
    if (!supportsPassive) {
      this.skip();
    }

    class C extends UpdatingElement {
      defaultPrevented?: boolean;

      constructor() {
        super();
        this.addEventListener(
          'click',
          (e: Event) => this.onClick(e),
          (this.onClick as unknown) as AddEventListenerOptions
        );
      }

      @eventOptions({passive: true})
      onClick(e: Event) {
        try {
          e.preventDefault();
        } catch (error) {
          // no need to do anything
        }
        this.defaultPrevented = e.defaultPrevented;
      }
    }
    customElements.define(generateElementName(), C);

    const c = new C();
    container.appendChild(c);
    await c.updateComplete;
    c.click();
    assert.isFalse(c.defaultPrevented);
  });
});