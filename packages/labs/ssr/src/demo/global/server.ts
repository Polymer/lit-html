/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import Koa from 'koa';
import staticFiles from 'koa-static';
import koaNodeResolve from 'koa-node-resolve';
import {URL} from 'url';
import * as path from 'path';
import {Readable} from 'stream';
import {renderAppWithInitialData} from './app-server.js';

const {nodeResolve} = koaNodeResolve;

const moduleUrl = new URL(import.meta.url);
const packageRoot = path.resolve(moduleUrl.pathname, '../../..');

const port = 8080;

// This is a fairly standard Koa server that represents how the SSR API might
// be used.
const app = new Koa();
app.use(async (ctx: Koa.Context, next: Koa.Next) => {
  // Pass through anything not the root path to static file serving
  if (ctx.URL.pathname !== '/') {
    await next();
    return;
  }

  const ssrResult = renderAppWithInitialData();
  ctx.type = 'text/html';
  ctx.body = Readable.from(ssrResult);
});
app.use(nodeResolve({}));
app.use(staticFiles(packageRoot));
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
