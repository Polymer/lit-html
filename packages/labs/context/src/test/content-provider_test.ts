/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {LitElement, html, TemplateResult} from 'lit';
import {property} from 'lit/decorators/property.js';

import {ContextProvider, createContext} from '../lit-context';
import {assert} from '@esm-bundle/chai';
import {ContextConsumer} from '../lib/controllers/context-consumer.js';

const simpleContext = createContext<number>('simple-context');

class SimpleContextProvider extends LitElement {
  private provider = new ContextProvider(this, simpleContext, 1000);

  public setValue(value: number) {
    this.provider.setValue(value);
  }
}

class MultipleContextConsumer extends LitElement {
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

class OnceContextConsumer extends LitElement {
  @property({type: Number})
  public value = 0;

  public constructor() {
    super();
    new ContextConsumer(this, simpleContext, (value) => {
      this.value = value;
    });
  }

  protected render(): TemplateResult {
    return html`Value <span id="value">${this.value}</span>`;
  }
}

customElements.define('multiple-context-consumer', MultipleContextConsumer);
customElements.define('once-context-consumer', OnceContextConsumer);
customElements.define('simple-context-provider', SimpleContextProvider);

suite('context-provider', () => {
  let provider: SimpleContextProvider;
  let consumer: MultipleContextConsumer;

  setup(async () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <simple-context-provider>
        <multiple-context-consumer></multiple-context-consumer>
      </simple-context-provider>
    `;
    document.body.appendChild(container);

    provider = container.querySelector(
      'simple-context-provider'
    ) as SimpleContextProvider;
    assert.isDefined(provider);
    consumer = provider.querySelector(
      'multiple-context-consumer'
    ) as MultipleContextConsumer;
    assert.isDefined(consumer);
  });

  test(`consumer receives a context`, async () => {
    assert.strictEqual(consumer.value, 1000);
  });

  test(`consumer receives updated context on provider change`, async () => {
    assert.strictEqual(consumer.value, 1000);
    provider.setValue(500);
    assert.strictEqual(consumer.value, 500);
  });

  test(`multiple consumers receive the same context`, async () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <multiple-context-consumer>
      </multiple-context-consumer>
    `;
    provider.appendChild(container);
    const consumer2 = container.querySelector(
      'multiple-context-consumer'
    ) as MultipleContextConsumer;
    assert.isDefined(consumer2);

    assert.strictEqual(consumer.value, 1000);
    assert.strictEqual(consumer2.value, 1000);

    provider.setValue(500);
    assert.strictEqual(consumer.value, 500);
    assert.strictEqual(consumer2.value, 500);
  });
  test(`one-time consumers only receive context once`, async () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <once-context-consumer>
      </once-context-consumer>
    `;
    provider.appendChild(container);
    const consumer2 = container.querySelector(
      'once-context-consumer'
    ) as OnceContextConsumer;
    assert.isDefined(consumer2);

    assert.strictEqual(consumer.value, 1000);
    assert.strictEqual(consumer2.value, 1000);

    provider.setValue(500);
    assert.strictEqual(consumer.value, 500);
    assert.strictEqual(consumer2.value, 1000); // one-time consumer still has old value
  });
});
