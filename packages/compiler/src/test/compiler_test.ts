/**
 * @license
 * Copyright (c) 2020 The Polymer Project Authors. All rights reserved.
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

import tape, {Test} from 'tape';
import tapePromiseLib from 'tape-promise';

import ts from 'typescript';

// import {hello, compile} from '../lib/compiler.js';
import {compileLitTemplates} from '../lib/template-transform.js';
import {_Σ as litHtmlPrivate} from 'lit-html';

const {_marker} = litHtmlPrivate;

const tapePromise = (tapePromiseLib as any).default as typeof tapePromiseLib;
const test = tapePromise(tape);

// test('meta', async (t: Test) => {
//   compile('./testdata/basic/input/tsconfig.json');
//   t.equal(hello(), 'Hello');
// });

test('basic', async (t: Test) => {
  const source = `
import { html } from 'lit-html';
export const sayHello = (name) => html \`<h1>Hello \${name}</h1>\`;
  `;
  const result = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.Latest,
      module: ts.ModuleKind.ES2020,
    },
    transformers: {before: [compileLitTemplates()]},
  });
  console.log(result.outputText);

  t.equal(
    result.outputText.trim(),
    `
import { html } from 'lit-html';
var lit_template_1 = { _strings: ["<h1>Hello ", "</h1>"], _element: document.createElement("template"), _parts: [{ _type: 2, index: 2 }] };
lit_template_1.innerHTML = "<h1>Hello <?${_marker}></h1>"
export const sayHello = (name) => ({ _$litType$: lit_template_1, values: [name] });
`.trim()
  );
});
