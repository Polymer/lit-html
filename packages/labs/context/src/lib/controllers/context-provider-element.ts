import {LitElement} from 'lit';
import {property, customElement} from 'lit/decorators.js';
import {AnyContext, ContextType} from '../create-context.js';

import {ContextProvider} from './context-provider.js';

declare global {
  interface HTMLElementTagNameMap {
    'context-provider': ContextProviderElement<AnyContext>;
  }
}

@customElement('context-provider')
export class ContextProviderElement<T extends AnyContext> extends LitElement {
  private localValue?: ContextType<T>;

  @property({attribute: false})
  public set value(value: ContextType<T>) {
    this.localValue = value;
    if (this.provider) {
      this.provider.value = value;
    }
  }

  private provider?: ContextProvider<T>;

  @property({attribute: false})
  public set context(value: T) {
    if (!this.provider) {
      this.provider = new ContextProvider(this, value, this.localValue);
    } else {
      throw new Error('Can only set context provider element name once!');
    }
  }

  public createRenderRoot(): Element {
    return this;
  }
}
