/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import test from 'tape';
import {configureSsrLocalization} from '../ssr.js';
import {render} from '../../../labs/ssr/lib/render-with-global-dom-shim.js';
import {html} from 'lit';
import {msg} from '@lit/localize';

const translations = new Map([
  [
    'es',
    {
      templates: {
        hello: html`Hola`,
        world: html`Mundo`,
      },
    },
  ],
  [
    'nl',
    {
      templates: {
        hello: html`Hallo`,
        world: html`Wereld`,
      },
    },
  ],
]);

const {withLocale} = await configureSsrLocalization({
  sourceLocale: 'en',
  targetLocales: ['es', 'nl'],
  loadLocale: async (locale) => translations.get(locale),
});

const concat = (iterator: Iterable<string>) => {
  let out = '';
  for (const part of iterator) {
    out += part;
  }
  return out;
};

const removeHtmlComments = (htmlStr: string) =>
  htmlStr.replace(/<!--.*?-->/g, '');

const randomTimeout = () =>
  new Promise((r) => setTimeout(r, Math.random() * 30));

const renderHelloWorld = (locale: string) =>
  new Promise<string>((resolve) => {
    withLocale(locale, async () => {
      const hello = concat(render(msg(html`Hello`, {id: 'hello'})));
      // Randomize reentry to simulate concurrent requests to an async server.
      await randomTimeout();
      const world = concat(render(msg(html`World`, {id: 'world'})));
      resolve(removeHtmlComments(`${hello} ${world}`));
    });
  });

test('renders en in isolation', async (t) => {
  t.is(await renderHelloWorld('en'), 'Hello World');
});

test('renders es in isolation', async (t) => {
  t.is(await renderHelloWorld('es'), 'Hola Mundo');
});

test('renders nl in isolation', async (t) => {
  t.is(await renderHelloWorld('nl'), 'Hallo Wereld');
});

test('renders all 3 locales concurrently', async (t) => {
  // Run a bunch of times to simulate more concurrency.
  for (let i = 0; i < 10; i++) {
    const en = renderHelloWorld('en');
    const es = renderHelloWorld('es');
    const nl = renderHelloWorld('nl');

    t.is(await en, 'Hello World', `[${i}] en`);
    t.is(await es, 'Hola Mundo', `[${i}] es`);
    t.is(await nl, 'Hallo Wereld', `[${i}] nl`);
  }
});
