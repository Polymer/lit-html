# @lit-labs/scoped-registry-mixin

`ScopedRegistryHost` mixin for `LitElement` that integrates with the speculative [Scoped CustomElementRegistry polyfill](https://github.com/webcomponents/polyfills/tree/master/packages/scoped-custom-element-registry).

🚨 **Warning: Scoped Custom Element Registries is a proposed browser API. It has not been finalized nor shipped in any browser.** This mixin is provided to evaluate the proposal and facilitate feedback. **Use this feature, and the polyfill in production code at your own risk.**

## Overview

The [Scoped Custom Element Registries](https://github.com/WICG/webcomponents/blob/gh-pages/proposals/Scoped-Custom-Element-Registries.md) WICG proposal introduces new APIs for scoping custom element definitions to shadow roots, such that the mapping of tag names to custom element class doesn't rely on a single global registry.

When new elements are created within a shadow root with a scoped custom element registry, the browser will use the scoped registry rather than the global registry to look up custom element definitions. When using a scoped element registry, all used custom element elements must be defined within that scope.

`ScopedRegistryHost` adds the following features to LitElement:

1. Automatically creates a scoped CustomElementRegistry for the class
2. Provides sugar for defining custom elements in the scoped registry
3. Passes the registry to `attachShadow()` to enable scoping
4. Passes the shadow root to lit-html to create DOM within the scope

A speculative [Scoped CustomElementRegistry polyfill](https://github.com/webcomponents/polyfills/tree/master/packages/scoped-custom-element-registry) is being developed. Because the proposal is not implemented natively, `ScopedRegistryHost` requires the polyfill.

## Usage

The mixin adds a declarative `static elementDefinitions` property for declaring the custom elements to be scoped locally to its Shadow DOM.

Basic usage is as follows:

```js
import {LitElement, html} from 'lit';
import {ScopedRegistryHost} from '@lit-labs/scoped-registry-mixin';

import {SimpleGreeting} from './simple-greeting.js';

class ScopedComponent extends ScopedRegistryHost(LitElement) {
  // Elements here will be registered against the tag names provided only
  // in the shadow root for this element
  static elementDefinitions = {
    'simple-greeting': SimpleGreeting,
  };

  render() {
    return html` <simple-greeting
      id="greeting"
      name="scoped world"
    ></simple-greeting>`;
  }
}
```

## Contributing

Please see [CONTRIBUTING.md](../../../CONTRIBUTING.md).
