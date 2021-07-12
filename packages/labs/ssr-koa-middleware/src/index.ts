/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import Koa from 'koa';
import {renderModule} from '@lit-labs/ssr/lib/render-module.js';
import {Readable} from 'stream';

import * as path from 'path';

export interface RenderHTMLFileOptions {
  /** The HTTP root folder, for resolving URL paths to static files */
  root: string;
  /** A fallback file to use if the specified URL did not exist */
  fallback: string;
  /** Use separate VM context for each request */
  useVM?: boolean;
}

/**
 * Koa middleware for rendering HTML files using render-lit-html.
 *
 * This middleware will only handle URLs to files with `.html` or bare paths
 * with `accept: text/html` or `accept: *`. If a static file does not exist at
 * the specified URL path, the `fallback` file will be rendered/served.
 *
 * Any `<script>` tags that should be loaded & run on the server prior to
 * rendering should be marked with an `ssr` attribute.  If any of these scripts
 * are modules that have an `initializeSSR` export, it will be invoked and
 * awaited prior to rendering.  If any `initializeSSR` methods resolve to arrays
 * of values, those values will be interpolated into `<!--lit-ssr-value-->`
 * comment markers found in the page.
 *
 * @param options
 */
export const renderHTMLFile = (options: RenderHTMLFileOptions) => async (
  ctx: Koa.ParameterizedContext<Koa.DefaultState, Koa.DefaultContext>,
  next: Koa.Next
) => {
  // Only handle GET's
  if (ctx.method !== 'GET') {
    return next();
  }
  // Only handle .html extension or bare paths
  const ext = path.extname(ctx.path);
  if (ext && ext !== '.html') {
    return next();
  }
  // Only handle HTML or *, but never JSON
  if (!ctx.headers || typeof ctx.headers.accept !== 'string') {
    return next();
  }
  if (ctx.headers.accept.includes('application/json')) {
    return next();
  }
  if (
    !(
      ctx.headers.accept.includes('text/html') ||
      ctx.headers.accept.includes('*/*')
    )
  ) {
    return next();
  }
  const args = {url: ctx.href, root: options.root, fallback: options.fallback};
  let ssrResult;
  if (options.useVM) {
    // Render the file using a new VM context for each request
    ssrResult = await renderModule(
      './render-html-file.js',
      import.meta.url,
      'renderFile',
      [args]
    );
  } else {
    await import('@lit-labs/ssr/lib/install-global-dom-shim.js');
    ssrResult = (await import('./render-html-file.js')).renderFile(args);
  }
  const stream = Readable.from(ssrResult);
  stream.on('error', (e) => {
    console.error(e.message);
    console.error(e.stack);
  });
  ctx.type = 'text/html';
  ctx.body = stream;
  return;
};
