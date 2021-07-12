/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import html from '@web/rollup-plugin-html';
import polyfillsLoader from '@web/rollup-plugin-polyfills-loader';
import {copy} from '@web/rollup-plugin-copy';
import resolve from '@rollup/plugin-node-resolve';
import {terser} from 'rollup-plugin-terser';
import summary from 'rollup-plugin-summary';
import minifyHTML from 'rollup-plugin-minify-html-literals';
import {getBabelOutputPlugin} from '@rollup/plugin-babel';

const htmlPlugin = html({
  rootDir: './',
  flattenOutput: false,
  // Injects a feature detection script to test for modern ES2020 syntax, used
  // to determine whether to load the modern or legacy build
  transformHtml: (html) => {
    return html.replace(
      '<script',
      `<script>window.__isModern=window?.window;</script><script`
    );
  },
});

export default {
  // Entry point for application build; can specify a glob to build multiple
  // HTML files for non-SPA app
  input: 'index.html',
  plugins: [
    htmlPlugin,
    // Resolve bare module specifiers to relative paths
    resolve(),
    // Minify HTML template literals
    minifyHTML(),
    // Minify JS
    terser({
      module: true,
      warnings: true,
    }),
    // Inject polyfills into HTML (core-js, regnerator-runtime, webcoponents,
    // lit/polyfill-support) and dynamically loads modern vs. legacy builds
    polyfillsLoader({
      modernOutput: {
        name: 'modern',
      },
      // Feature detection for loading legacy bundles
      legacyOutput: {
        name: 'legacy',
        test: '!window.__isModern',
        type: 'systemjs',
      },
      // List of polyfills to inject (each has individual feature detection)
      polyfills: {
        hash: true,
        coreJs: true,
        regeneratorRuntime: true,
        fetch: true,
        webcomponents: true,
        // Custom configuration for loading Lit's polyfill-support module,
        // required for interfacing with the webcomponents polyfills
        custom: [
          {
            name: 'lit-polyfill-support',
            path: 'node_modules/lit/polyfill-support.js',
            test: "!('attachShadow' in Element.prototype)",
            module: false,
          },
        ],
      },
    }),
    // Print bundle summary
    summary(),
    // Optional: copy any static assets to build directory
    copy({
      patterns: ['data/**/*', 'images/**/*'],
    }),
  ],
  // Specifies two JS output configurations, modern and legacy, which the HTML plugin will
  // automatically choose between; the legacy build is transpiled to ES5
  // and SystemJS modules
  output: [
    {
      // Modern JS bundles (no JS transpilation, ES module output)
      format: 'esm',
      chunkFileNames: '[name]-[hash].js',
      entryFileNames: '[name]-[hash].js',
      dir: 'build',
      plugins: [htmlPlugin.api.addOutput('modern')],
    },
    {
      // Legacy JS bundles (ES5 transpilation and SystemJS module output)
      format: 'esm',
      chunkFileNames: 'legacy-[name]-[hash].js',
      entryFileNames: 'legacy-[name]-[hash].js',
      dir: 'build',
      plugins: [
        htmlPlugin.api.addOutput('legacy'),
        // Uses babel to compile JS to ES5 and modules to SystemJS
        getBabelOutputPlugin({
          compact: true,
          presets: [
            [
              '@babel/preset-env',
              {
                targets: {
                  ie: '11',
                },
                modules: 'systemjs',
              },
            ],
          ],
        }),
      ],
    },
  ],
  preserveEntrySignatures: false,
};
