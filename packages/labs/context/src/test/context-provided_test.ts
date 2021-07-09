/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {LitElement} from 'lit';
import {property} from 'lit/decorators/property.js';

import {ContextProvider, createContext} from '../lit-context';
import {assert} from '@esm-bundle/chai';
import {contextProvided} from '../lib/decorators/context-provided';

const simpleContext = createContext<number>('simple-context');

class SimpleContextProvider extends LitElement {
  private provider = new ContextProvider(this, simpleContext, 1000);

  public setValue(value: number) {
    this.provider.setValue(value);
  }
}

class SimpleContextConsumer extends LitElement {
  @contextProvided({context: simpleContext})
  @property({type: Number})
  public onceValue = 0;

  @contextProvided({context: simpleContext, multiple: true})
  @property({type: Number})
  public multipleValue = 0;
}

customElements.define('simple-context-consumer', SimpleContextConsumer);
customElements.define('simple-context-provider', SimpleContextProvider);

suite('context-provider', () => {
  let provider: SimpleContextProvider;
  let consumer: SimpleContextConsumer;

  setup(async () => {
    const container = document.createElement('div');
    container.innerHTML = `
       <simple-context-provider>
         <simple-context-consumer></simple-context-consumer>
       </simple-context-provider>
     `;
    document.body.appendChild(container);

    provider = container.querySelector(
      'simple-context-provider'
    ) as SimpleContextProvider;
    assert.isDefined(provider);
    consumer = provider.querySelector(
      'simple-context-consumer'
    ) as SimpleContextConsumer;
    assert.isDefined(consumer);
  });

  test(`consumer receives a context`, async () => {
    assert.strictEqual(consumer.onceValue, 1000);
    assert.strictEqual(consumer.multipleValue, 1000);
  });

  test(`consumer receives updated context on provider change`, async () => {
    assert.strictEqual(consumer.onceValue, 1000);
    assert.strictEqual(consumer.multipleValue, 1000);
    provider.setValue(500);
    assert.strictEqual(consumer.onceValue, 1000); // once value shouldn't change
    assert.strictEqual(consumer.multipleValue, 500);
  });
});
