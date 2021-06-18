# @lit/transformers

[npm-img]: https://img.shields.io/npm/v/@lit/transformers
[npm-href]: https://www.npmjs.com/package/@lit/transformers
[test-img]: https://github.com/lit/lit/workflows/Tests/badge.svg?branch=master
[test-href]: https://github.com/lit/lit/actions?query=workflow%3ATests+branch%3Amaster+event%3Apush

[![Published on NPM][npm-img]][npm-href]
[![Test status][test-img]][test-href]

TypeScript transformers for the [Lit decorators](https://lit.dev/docs/components/decorators/).

## Example

### Before

```ts
import {LitElement, html} from 'lit';
import {
  customElement,
  property,
  state,
  query,
  eventOptions,
} from 'lit/decorators.js';

@customElement('simple-greeting')
class SimpleGreeting extends LitElement {
  @property()
  name = 'Somebody';

  @state()
  private counter = 0;

  @query('#myButton')
  button?: HTMLButtonElement;

  render() {
    return html`
      <button id="myButton" @click=${this._onClick}>
        Hello ${this.name} (${this.counter})
      </button>
    `;
  }

  @eventOptions({capture: true})
  private _onClick(event: Event) {
    this.counter++;
    console.log('click', event.target);
  }
}
```

### After

```ts
import {LitElement, html} from 'lit';

class MyElement extends LitElement {
  static get properties() {
    return {
      str: {},
      num: {state: true, attribute: false},
    };
  }

  get button() {
    return this.renderRoot?.querySelector('#myButton');
  }

  constructor() {
    super(...arguments);
    this.name = 'Somebody';
    this.counter = 0;
  }

  render() {
    return html`
      <button
        id="myButton"
        @click=${{
          handleEvent: (e) => this._onClick(e),
          capture: true,
        }}
      >
        Hello ${this.name} (${this.counter})
      </button>
    `;
  }

  private _onClick(event: Event) {
    this.counter++;
    console.log('click', event.target);
  }
}

customElements.define('simple-greeting', SimpleGreeting);
```

## Install

```sh
npm i @lit/transformers
```

## Usage

### Option 1: ttypescript

[ttypescript](https://github.com/cevek/ttypescript) wraps the standard
TypeScript compiler and adds the ability to run transformer plugins:

```sh
npm i ttypescript
```

Update your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "transform": "@lit/transformers/lib/idiomatic.js"
      }
    ]
  }
}
```

Now use `tssc` instead of `tsc`:

```sh
npx ttsc
```

### Option 2: TypeScript API

If you are using the [TypeScript compiler
API](https://github.com/microsoft/TypeScript-wiki/blob/master/Using-the-Compiler-API.md),
pass the transformer to the `customTransformers` parameter of `Program.emit`:

```ts
import idiomaticLitDecoratorsTransform from '@lit/transformers/lib/idiomatic.js';
import ts from 'typescript';

// Note this is not a complete example. For more information see
// https://github.com/microsoft/TypeScript-wiki/blob/master/Using-the-Compiler-API.md
const program = ts.createProgram(rootNames, options);
const result = program.emit(undefined, undefined, undefined, undefined, {
  before: [idiomaticLitDecoratorTransformer(program)],
});
```
