/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {litLocalizeTransform} from '../modes/transform.js';
import ts from 'typescript';
import {Message, makeMessageIdMap} from '../messages.js';
import {test} from 'uvu';
import * as assert from 'uvu/assert';
import prettier from 'prettier';
import {
  compileTsFragment,
  CompilerHostCache,
} from '@lit/transformers/lib/tests/compile-ts-fragment.js';

const cache = new CompilerHostCache();
const IMPORT_MSG = `import { msg, str } from "@lit/localize";\n`;
const IMPORT_LIT = `import { html } from "lit";\n`;

/**
 * Compile the given fragment of TypeScript source code using the lit-localize
 * litLocalizeTransformer with the given translations. Check that there are no errors and
 * that the output matches (prettier-formatted).
 */
function checkTransform(
  inputTs: string,
  expectedJs: string,
  opts?: {
    messages?: Message[];
    autoImport?: boolean;
    locale?: string;
  }
) {
  if (opts?.autoImport ?? true) {
    // Rather than fuss with imports in all the test cases, this little hack
    // automatically imports for `msg` and `html` (assuming those strings aren't
    // used with any other meanings).
    if (inputTs.includes('msg')) {
      inputTs = IMPORT_MSG + inputTs;
      // Note we don't expect to see the `msg` import in the output JS, since it
      // should be un-used after litLocalizeTransformation.
    }
    if (inputTs.includes('html')) {
      inputTs = IMPORT_LIT + inputTs;
      expectedJs = IMPORT_LIT + expectedJs;
    }
  }
  const options = ts.getDefaultCompilerOptions();
  options.target = ts.ScriptTarget.ES2015;
  options.module = ts.ModuleKind.ESNext;
  options.moduleResolution = ts.ModuleResolutionKind.NodeJs;
  // Don't automatically load typings from nodes_modules/@types, we're not using
  // them here, so it's a waste of time.
  options.typeRoots = [];
  options.experimentalDecorators = true;
  const result = compileTsFragment(inputTs, '', options, cache, (program) => ({
    before: [
      litLocalizeTransform(
        makeMessageIdMap(opts?.messages ?? []),
        opts?.locale ?? 'en',
        program
      ),
    ],
  }));

  let formattedExpected = prettier.format(expectedJs, {parser: 'typescript'});
  // TypeScript >= 4 will add an empty export statement if there are no imports
  // or exports to ensure this is a module. We don't care about checking this.
  const unformattedActual = (result.code || '').replace('export {};', '');
  let formattedActual;
  try {
    formattedActual = prettier.format(unformattedActual, {
      parser: 'typescript',
    });
  } catch {
    // We might emit invalid TypeScript in a failing test. Rather than fail with
    // a Prettier parse exception, it's more useful to see a diff.
    formattedExpected = expectedJs;
    formattedActual = unformattedActual;
  }
  assert.is(formattedActual, formattedExpected);
  assert.equal(result.diagnostics, []);
}

test('unchanged const', () => {
  const src = 'const foo = "foo";';
  checkTransform(src, src);
});

test('unchanged html', () => {
  const src =
    'const foo = "foo"; const bar = "bar"; html`Hello ${foo} and ${bar}!`;';
  checkTransform(src, src);
});

test('msg(string)', () => {
  checkTransform('msg("Hello World", {id: "foo"});', '"Hello World";');
});

test('msg(string) unnecessarily tagged with str', () => {
  checkTransform('msg(str`Hello World`, {id: "foo"});', '`Hello World`;');
});

test('msg(string) translated', () => {
  checkTransform('msg("Hello World", {id: "foo"});', '`Hola Mundo`;', {
    messages: [{name: 'foo', contents: ['Hola Mundo']}],
  });
});

test('html(msg(string))', () => {
  checkTransform(
    'html`<b>${msg("Hello World", {id: "foo"})}</b>`;',
    'html`<b>Hello World</b>`;'
  );
});

test('html(msg(string)) translated', () => {
  checkTransform(
    'html`<b>${msg("Hello World", {id: "foo"})}</b>`;',
    'html`<b>Hola Mundo</b>`;',
    {messages: [{name: 'foo', contents: ['Hola Mundo']}]}
  );
});

test('html(msg(html))', () => {
  checkTransform(
    'html`<b>${msg(html`Hello <i>World</i>`, {id: "foo"})}</b>`;',
    'html`<b>Hello <i>World</i></b>`;'
  );
});

test('html(msg(html)) translated', () => {
  checkTransform(
    'html`<b>${msg(html`Hello <i>World</i>`, {id: "foo"})}</b>`;',
    'html`<b>Hola <i>Mundo</i></b>`;',
    {
      messages: [
        {
          name: 'foo',
          contents: [
            'Hola ',
            {untranslatable: '<i>'},
            'Mundo',
            {untranslatable: '</i>'},
          ],
        },
      ],
    }
  );
});

test('msg(string(expr))', () => {
  checkTransform(
    'const name = "World";' + 'msg(str`Hello ${name}!`, {id: "foo"});',
    'const name = "World";' + '`Hello ${name}!`;'
  );
});

test('msg(string(expr)) translated', () => {
  checkTransform(
    'const name = "World";' + 'msg(str`Hello ${name}!`, {id: "foo"});',
    'const name = "World";' + '`Hola ${name}!`;',
    {
      messages: [
        {
          name: 'foo',
          contents: ['Hola ', {untranslatable: '${name}'}, '!'],
        },
      ],
    }
  );
});

test('msg(string(string))', () => {
  checkTransform(
    'msg(str`Hello ${"World"}!`, {id: "foo"});',
    '`Hello World!`;'
  );
});

test('msg(string(string)) translated', () => {
  checkTransform(
    'msg(str`Hello ${"World"}!`, {id: "foo"});',
    '`Hola World!`;',
    {
      messages: [
        {
          name: 'foo',
          contents: ['Hola ', {untranslatable: '${"World"}'}, '!'],
        },
      ],
    }
  );
});

test('msg(html(expr))', () => {
  checkTransform(
    'const name = "World";' + 'msg(html`Hello <b>${name}</b>!`, {id: "foo"});',
    'const name = "World";' + 'html`Hello <b>${name}</b>!`;'
  );
});

test('msg(html(expr)) translated', () => {
  checkTransform(
    'const name = "World";' + 'msg(html`Hello <b>${name}</b>!`, {id: "foo"});',
    'const name = "World";' + 'html`Hola <b>${name}</b>!`;',
    {
      messages: [
        {
          name: 'foo',
          contents: ['Hola ', {untranslatable: '<b>${name}</b>'}, '!'],
        },
      ],
    }
  );
});

test('msg(html(string))', () => {
  checkTransform(
    'msg(html`Hello <b>${"World"}</b>!`, {id: "foo"});',
    'html`Hello <b>World</b>!`;'
  );
});

test('msg(html(string)) translated', () => {
  checkTransform(
    'msg(html`Hello <b>${"World"}</b>!`, {id: "foo"});',
    'html`Hola <b>World</b>!`;',
    {
      messages: [
        {
          name: 'foo',
          contents: ['Hola ', {untranslatable: '<b>${"World"}</b>'}, '!'],
        },
      ],
    }
  );
});

test('msg(html(html))', () => {
  checkTransform(
    'msg(html`Hello <b>${html`<i>World</i>`}</b>!`, {id: "foo"});',
    'html`Hello <b><i>World</i></b>!`;'
  );
});

test('msg(html(html)) translated', () => {
  checkTransform(
    'msg(html`Hello <b>${html`<i>World</i>`}</b>!`, {id: "foo"});',
    'html`Hola <b><i>World</i></b>!`;',
    {
      messages: [
        {
          name: 'foo',
          contents: [
            'Hola ',
            {untranslatable: '<b>${html`<i>World</i>`}</b>'},
            '!',
          ],
        },
      ],
    }
  );
});

test('msg(string(msg(string)))', () => {
  checkTransform(
    'msg(str`Hello ${msg("World", {id: "bar"})}!`, {id: "foo"});',
    '`Hello World!`;'
  );
});

test('msg(string(msg(string))) translated', () => {
  checkTransform(
    'msg(str`Hello ${msg("World", {id: "bar"})}!`, {id: "foo"});',
    '`Hola Mundo!`;',
    {
      messages: [
        {
          name: 'foo',
          contents: [
            'Hola ',
            {untranslatable: '${msg("World", {id: "bar"})}'},
            '!',
          ],
        },
        {
          name: 'bar',
          contents: ['Mundo'],
        },
      ],
    }
  );
});

test('msg(string(<b>msg(string)</b>)) translated', () => {
  checkTransform(
    'msg(str`Hello <b>${msg("World", {id: "bar"})}</b>!`, {id: "foo"});',
    '`Hola <b>Mundo</b>!`;',
    {
      messages: [
        {
          name: 'foo',
          contents: [
            'Hola ',
            {untranslatable: '<b>${msg("World", {id: "bar"})}</b>'},
            '!',
          ],
        },
        {
          name: 'bar',
          contents: ['Mundo'],
        },
      ],
    }
  );
});

test('import * as litLocalize', () => {
  checkTransform(
    `
    import * as litLocalize from '@lit/localize';
    litLocalize.msg("Hello World", {id: "foo"});
  `,
    '"Hello World";',
    {autoImport: false}
  );
});

test('import {msg as foo}', () => {
  checkTransform(
    `
    import {msg as foo} from '@lit/localize';
    foo("Hello World", {id: "foo"});
  `,
    '"Hello World";',
    {autoImport: false}
  );
});

test('exclude different msg function', () => {
  checkTransform(
    `function msg(template: string, options?: {id?: string}) { return template; }
    msg("Hello World", {id: "foo"});`,
    `function msg(template, options) { return template; }
    msg("Hello World", {id: "foo"});`,
    {autoImport: false}
  );
});

test('configureTransformLocalization() -> {getLocale: () => "es-419"}', () => {
  checkTransform(
    `import {configureTransformLocalization} from '@lit/localize';
     const {getLocale} = configureTransformLocalization({
       sourceLocale: 'en',
     });
     const locale = getLocale();`,
    `const {getLocale} = {getLocale: () => 'es-419'};
     const locale = getLocale();`,
    {locale: 'es-419'}
  );
});

test('configureLocalization() throws', () => {
  assert.throws(
    () =>
      checkTransform(
        `import {configureLocalization} from '@lit/localize';
         configureLocalization({
           sourceLocale: 'en',
           targetLocales: ['es-419'],
           loadLocale: (locale: string) => import(\`/\${locale}.js\`),
         });`,
        ``
      ),
    'Cannot use configureLocalization in transform mode'
  );
});

test('LOCALE_STATUS_EVENT => "lit-localize-status"', () => {
  checkTransform(
    `import {LOCALE_STATUS_EVENT} from '@lit/localize';
     window.addEventListener(LOCALE_STATUS_EVENT, () => console.log('ok'));`,
    `window.addEventListener('lit-localize-status', () => console.log('ok'));`
  );
});

test('litLocalize.LOCALE_STATUS_EVENT => "lit-localize-status"', () => {
  checkTransform(
    `import * as litLocalize from '@lit/localize';
     window.addEventListener(litLocalize.LOCALE_STATUS_EVENT, () => console.log('ok'));`,
    `window.addEventListener('lit-localize-status', () => console.log('ok'));`
  );
});

test('re-assigned LOCALE_STATUS_EVENT', () => {
  checkTransform(
    `import {LOCALE_STATUS_EVENT} from '@lit/localize';
     const event = LOCALE_STATUS_EVENT;
     window.addEventListener(event, () => console.log('ok'));`,
    `const event = 'lit-localize-status';
     window.addEventListener(event, () => console.log('ok'));`
  );
});

test('different LOCALE_STATUS_EVENT variable unchanged', () => {
  checkTransform(
    `const LOCALE_STATUS_EVENT = "x";`,
    `const LOCALE_STATUS_EVENT = "x";`
  );
});

test('different variable cast to "lit-localize-status" unchanged', () => {
  checkTransform(`const x = "x" as "lit-localize-status";`, `const x = "x";`);
});

test('updateWhenLocaleChanges -> undefined', () => {
  checkTransform(
    `import {LitElement, html} from 'lit';
     import {msg, updateWhenLocaleChanges} from '@lit/localize';
     class MyElement extends LitElement {
       constructor() {
         super();
         updateWhenLocaleChanges(this);
       }
       render() {
         return html\`<b>\${msg('Hello World!', {id: 'greeting'})}</b>\`;
       }
     }`,
    `import {LitElement, html} from 'lit';
     class MyElement extends LitElement {
       constructor() {
         super();
         undefined;
       }
       render() {
         return html\`<b>Hello World!</b>\`;
       }
     }`,
    {autoImport: false}
  );
});

test('@localized removed', () => {
  checkTransform(
    `import {LitElement, html} from 'lit';
     import {msg, localized} from '@lit/localize';
     @localized()
     class MyElement extends LitElement {
       render() {
         return html\`<b>\${msg('Hello World!', {id: 'greeting'})}</b>\`;
       }
     }`,
    `import {LitElement, html} from 'lit';
     class MyElement extends LitElement {
       render() {
         return html\`<b>Hello World!</b>\`;
       }
     }`,
    {autoImport: false}
  );
});

test.run();
