---
'@lit/localize-tools': patch
---

## Added

- Added `configureSsrLocalization` in `@lit/localize-tools/lib/ssr.js` which
  allows for safe concurrent rendering of localized templates with
  `@lit-labs/ssr` or other renderers using
  [`AsyncLocalStorage`](https://nodejs.org/api/async_hooks.html#async_hooks_class_asynclocalstorage).

  ```ts
  import {configureSsrLocalization} from '@lit/localize-tools/lib/ssr.js';
  import {render} from '@lit-labs/ssr/lib/render-with-global-dom-shim.js';
  import {html} from 'lit';

  const {withLocale} = await configureSsrLocalization({
    sourceLocale: 'en',
    targetLocales: ['es', 'nl'],
    loadLocale: (locale) => import(`./locales/${locale}.js`)),
  });

  const handleHttpRequest = (req, res) => {
    const locale = localeForRequest(req);
    withLocale(locale, async () => {
      // Any async work can happen in this function, and the request's locale
      // context will be safely preserved for every msg() call.
      await doSomeAsyncWork();
      for (const chunk of render(msg(html`Hello World`))) {
        res.write(chunk);
      }
      res.end();
    });
  };
  ```
