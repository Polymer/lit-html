/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const resolve = require('@rollup/plugin-node-resolve').default;

module.exports = {
  input: '_js/components.js',
  output: {
    file: '_js/components.bundle.js',
    format: 'umd',
    name: 'Components',
  },
  plugins: [resolve()],
};
