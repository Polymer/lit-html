# @lit-labs/eleventy-plugin-lit

A plugin for [Eleventy](www.11ty.dev) for pre-rendering pages that include Lit web components. The components can then be (optionally) hydrated on the client for interactivity.

## Usage

Call `addPlugin` in your `.eleventy.js` config file to add `eleventy-lit-plugin`.

You will need to tell the plugin where to find the component definitions for the
components you'll render in your templates by passing a list of one or more
scripts to load via the `componentModules` option. Because Eleventy does not
support ESM configuration files, your components will need to be built as
`commonjs`/`umd`.

```js
const litPlugin = require('../index.js');

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(litPlugin, {
    componentModules: ['./_js/components.bundle.js'],
  });
};
```

## Client-side hydration

For hydrating interactive components on the client, you should include
`lit/experimental-hydrate-support.js` along with the component definitions used
(it may be included in the same bundle passed to the eleventy plugin if serving
bundled sources on the client) _at the bottom of the page_. When server-rendering components, you should load definitions after components have been parsed.

Most browsers (excluding Chrome 90+) will also need to load and invoke the `@webcomponents/template-shadowroot` ponyfill prior to registering component definitions:

```html
<script type="module">
  // Hydrate template-shadowroots eagerly after rendering (for browsers without
  // native declarative shadow roots)
  import {
    hasNativeDeclarativeShadowRoots,
    hydrateShadowRoots,
  } from './node_modules/@webcomponents/template-shadowroot/template-shadowroot.js';
  if (!hasNativeDeclarativeShadowRoots) {
    hydrateShadowRoots(document.body);
  }
  // ...
  // Load and hydrate components lazily
  import('./_js/components.bundle.js');
</script>
```

## Notes

This plugin is primarily focused on rendering standalone widgets which can be configured with attributes in HTML into an 11ty site (there currently no facility for passing 11ty data into components via Javascript).

## Contributing

Please see [CONTRIBUTING.md](../../../CONTRIBUTING.md).
