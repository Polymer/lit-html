---
'@lit/localize': patch
---

### Added

- Added `configureReentrantLocalization` in `init/reentrant.js` which allows for
  safe concurrent rendering across multiple locales by asynchronous tasks, such
  as in an SSR context.

  In this configuration, there is no global `setLocale` function. Instead, the
  caller _provides_ a `getLocale` function, which is then called by every `msg`
  invocation.

  This pairs well with an asynchronous storage manager like
  [`AsyncLocalStorage`](https://nodejs.org/api/async_hooks.html#async_hooks_class_asynclocalstorage).
  See `configureSsrLocalization` from `@lit/localize-tools/lib/ssr.js` which
  does exactly this.

### Fixed

- Removed accidental export of `_msg` (use `msg` instead).
