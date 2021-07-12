# @lit-labs/ssr-koa-middleware

Koa middleware for server-side rendering HTML files containing lit components.

## Overview

This middleware will server-side render any `Lit` components included in
html files served in your application. It handles URLs to files with `.html` or
bare paths with `accept: text/html` or `accept: *`. If a static file does not
exist at the specified URL path, the `fallback` file will be rendered/served.

Below is an example usage of the lit-ssr `renderHTMLFile` middleware:

```js
// Example server.js

import * as path from 'path';
import Koa from 'koa';
import staticFiles from 'koa-static';
import koaNodeResolve from 'koa-node-resolve';
import {renderHTMLFile} from 'lit-ssr/lib/koa-render-html-file.js';

const {nodeResolve} = koaNodeResolve;

const root = /* Root of your webapp */;
const port = 8080;
const app = new Koa();

app.use(nodeResolve({root}));
app.use(renderHTMLFile({root, fallback: 'index.html'})); // Use `renderHTMLFile` plugin
app.use(staticFiles(root));
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
```

When using this middleware, there are a few steps you should do to prepare your
HTML files for proper server rendering:

- Add the `template-shadowroot` polyfill to hydrate server-rendered
  `<template shadowroot>` elements. Note that `hydrateShadowRoots` must run
  after the document is parsed, before any elements definitions are loaded.
  Loading all scripts as module scripts is an easy way to achieve this.
  For example:
  ```html
  <script type="module">
    import {hydrateShadowRoots} from './node_modules/template-shadowroot/template-shadowroot.js';
    hydrateShadowRoots(document.body);
  </script>
  ```
- Add `ssr` attribute to scripts that _should_ be executed on the server, for
  example, scripts that include custom element definitions. You should not put
  the `ssr` attribute on scripts that expect a full DOM API to be present. For
  example:
  ```html
  <script type="module" src="my-app-components.js" ssr></script>
  ```
- (Optional): Add `type="ssr-render"` scripts that should _only_ be
  executed on the server and whose tag will be replaced by the module's
  default export. This is useful for fetching/initializing application
  data on the server. If the default export is a function, it will be invoked,
  and if the value is a promise, it will be awaited before rendering.

  ```html
  <script type="ssr-render" src="initialize-server-data.js"></script>
  ```

  ```js
  // Example: initialize-server-data.js

  const initializeSSR = async (url: URL) => {
    // Fetch some initial data and put it on (server-side) window, for use by
    // server-rendered components
    const state = await (await fetch('some-data.json')).toJSON();
    window.__PRELOADED_STATE__ = state;
    // Serialize state (escaping HTML brackets for safety) and return as a Lit
    // value to interpolate into the client-side HTML page
    const stateString = JSON.stringify(state).replace(/</g, '\\u003c');
    return [
      unsafeHTML(`<script>window.__PRELOADED_STATE__=${stateString}</script>`),
    ];
  };
  export default initializeSSR;
  ```

Full example HTML file:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>My App</title>
    <script type="module">
      import {hydrateShadowRoots} from './node_modules/template-shadowroot/template-shadowroot.js';
      hydrateShadowRoots(document.body);
    </script>
    <script type="ssr-render" src="initialize-server-data.js"></script>
    <script type="module" src="my-app.js" ssr></script>
  </head>
  <body>
    <my-app></my-app>
  </body>
</html>
```

## Contributing

Please see [CONTRIBUTING.md](../../../CONTRIBUTING.md).
