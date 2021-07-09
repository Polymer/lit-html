/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {LitElement, html, TemplateResult, render} from 'lit';
import {property} from 'lit/decorators/property.js';

import {ContextProviderElement, createContext} from '../lit-context';
import {assert} from '@esm-bundle/chai';
import {ContextConsumer} from '../lib/controllers/context-consumer.js';

const simpleContext = createContext<number>('simple-context');

class SimpleContextConsumer extends LitElement {
  @property({type: Number})
  public value = 0;

  public constructor() {
    super();
    new ContextConsumer(
      this,
      simpleContext,
      (value) => {
        this.value = value;
      },
      true // allow multiple values
    );
  }

  protected render(): TemplateResult {
    return html`Value <span id="value">${this.value}</span>`;
  }
}

customElements.define('simple-context-consumer', SimpleContextConsumer);

suite('context-provider-element', () => {
  let provider: ContextProviderElement<typeof simpleContext>;
  let consumer: SimpleContextConsumer;

  setup(async () => {
    const container = document.createElement('div');
    const template = html`
      <context-provider .context=${simpleContext} .value=${1000}>
        <simple-context-consumer></simple-context-consumer>
      </context-provider>
    `;
    render(template, container);
    document.body.appendChild(container);

    provider = container.querySelector(
      'context-provider'
    ) as ContextProviderElement<typeof simpleContext>;
    assert.isDefined(provider);

    consumer = provider.querySelector(
      'simple-context-consumer'
    ) as SimpleContextConsumer;
    assert.isDefined(consumer);
  });

  test(`consumer receives a context`, async () => {
    assert.strictEqual(consumer.value, 1000);
  });

  test(`consumer receives updated context on provider change`, async () => {
    assert.strictEqual(consumer.value, 1000);
    provider.value = 500;
    assert.strictEqual(consumer.value, 500);
  });

  test(`multiple consumers receive the same context`, async () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <simple-context-consumer>
      </simple-context-consumer>
    `;
    provider.appendChild(container);
    const consumer2 = container.querySelector(
      'simple-context-consumer'
    ) as SimpleContextConsumer;
    assert.isDefined(consumer2);

    assert.strictEqual(consumer.value, 1000);
    assert.strictEqual(consumer2.value, 1000);

    provider.value = 500;
    assert.strictEqual(consumer.value, 500);
    assert.strictEqual(consumer2.value, 500);
  });
});
