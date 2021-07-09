# @lit-labs/context

## Overview

## Usage

There are several different usages of the Context API.

### Creating a Context

First lets define a context key we can use elsewhere in our examples:

```ts
import {createContext} from '@lit-labs/context';

export interface Logger {
  log: (msg: string) => void;
}

export const loggerContext = createContext<Logger>('logger');
```

### Consuming a Context

Now we can define a consumer for this context, some component in our app needs the logger:

```ts
import {ContextConsumer, property} from '@lit-labs/context';
import {LitElement} from 'lit';
import {Logger, loggerContext} from './logger.js';

export class MyElement extends LitElement {
  @property({attribute: false})
  public logger?: Logger;

  public constructor() {
    // add the consumer controller
    this.addController(
      new ContextConsumer(
        this,
        loggerContext,
        (value) => {
          this.logger = value;
        },
        true // pass true to get updates if the logger changes
      )
    );
  }
}
```

Another way we can use a context in a component is via the `contextProvided` decorator:

```ts
import {ContextConsumer, property} from '@lit-labs/context';
import {LitElement} from 'lit';
import {Logger, loggerContext} from './logger.js';

export class MyElement extends LitElement {
  @contextProvided({context: loggerContext, multiple: true})
  @property({attribute: false})
  public logger?: Logger;
}
```

### Providing a Context

Finally we want to be able to provide this context from somewhere higher in the DOM:

```ts
import {LitElement} from 'lit';
import '@lit-labs/context/lib/elements/context-provider-element.js';
import {loggerContext, Logger} from './my-logger.js';

const loggerContext = createContext('logger', new Logger());

export class MyApp extends LitElement {
  private logger: Logger = {
    log: (msg) => {
      console.log(`[my-app] ${msg}`);
    },
  };
  protected render(): TemplateResult {
    return html`
      <context-provider .context=${loggerContext} .value=${this.logger}>
        <my-thing></my-thing>
      </context-provider>
    `;
  }
}
```

We can also use the `ContextProvider` controller to define context without using an extra element:

```ts

```

## Contributing

Please see [CONTRIBUTING.md](../../../CONTRIBUTING.md).
