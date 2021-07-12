/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {render} from '@lit-labs/ssr/lib/render-lit-html.js';
import {promises as fs} from 'fs';
import path from 'path';
import {URL} from 'url';
import {DefaultTreeDocumentFragment} from 'parse5';
import {
  traverse,
  parseFragment,
  isElement,
  getAttr,
} from '@lit-labs/ssr/lib/util/parse5-utils.js';

interface RenderAppOptions {
  url: string;
  root: string;
  fallback: string;
  env?: {[key: string]: unknown};
}

/**
 * Process to render an HTML file for a given URL:
 * 1. Read the specified HTML file
 * 2. Find all `<script>` tags marked with `ssr`, `type="ssr"`, or
 *    `type="ssr-render"` attributes and dynamically imports them
 * 3. Any `type="ssr-render"` scripts are removed from the page, and their
 *    default export is awaited and rendered in its place.
 * 6. Return a TemplateResult constructed from the HTML page's contents and the
 *    values returned `type="ssr-render"` scripts.
 */
export async function renderFile(options: RenderAppOptions) {
  // Shim some useful globals onto window
  const url = new URL(options.url);
  Object.assign(window, {
    location: url,
    process: {env: {NODE_ENV: 'production', ...(options.env || {})}},
  });
  // Make sure file exists; if not, use fallback
  let file = path.join(options.root, url.pathname);
  let exists = false;
  try {
    exists = (await fs.stat(file)).isFile();
  } catch {
    /* Use fallback */
  }
  if (!exists) {
    file = path.join(options.root, options.fallback);
  }
  // Read file
  const content = await fs.readFile(file, 'utf-8');

  const ast = parseFragment(content, {
    sourceCodeLocationInfo: true,
  }) as DefaultTreeDocumentFragment;

  // Find scripts to run during SSR:
  // * <script src="./script1.js"> - runs on client, not on server
  // * <script src="./script2.js" ssr> - runs on client and on server
  // * <script src="./script3.js" type="ssr"> - runs on server, not on client
  // * <script src="./script4.js" type="ssr-render"> - runs on server, and its
  //   default export is awaited and rendered in its place
  let offset = 0;
  const strings: string[] = [];
  const scripts: string[] = [];
  const renderScripts: Set<string> = new Set();
  traverse(ast, {
    pre(node) {
      if (isElement(node) && node.tagName === 'script') {
        const type = getAttr(node, 'type');
        const ssr = getAttr(node, 'ssr') != null || type === 'ssr';
        const ssrRender = type === 'ssr-render';
        const src = getAttr(node, 'src');
        if ((ssr || ssrRender) && src) {
          scripts.push(src);
          if (ssrRender) {
            strings.push(
              content.slice(offset, node.sourceCodeLocation!.startOffset)
            );
            offset = node.sourceCodeLocation!.endOffset;
            renderScripts.add(src);
          }
        }
      }
    },
  });
  strings.push(content.slice(offset));

  // Load `ssr`-tagged scripts
  const values = [];
  for (const script of scripts) {
    const module = await import(path.join(options.root, script));
    // Await the default export from any `type="ssr-render"` scripts, and use as
    // a TemplateResult value (if the value is a function, run it first)
    if (renderScripts.has(script)) {
      let value = module.default;
      if (value === undefined) {
        throw new Error(
          `Expected type="ssr-render" script ${script} to have a default export`
        );
      }
      if (typeof value === 'function') {
        value = value(url);
      }
      values.push(await value);
    }
  }

  // Construct a TemplateResult
  return render({
    _$litType$: 1,
    strings,
    values,
  });
}
