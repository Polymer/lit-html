/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * A decorator that looks like the `customElement` decorator exported by
 * `lit/decorators.js`, but isn't because it's in a different module (and
 * doesn't do anything).
 */
export const customElement =
  (tagName: string) => (_classOrDescriptor: unknown) => {
    console.log(tagName);
  };

/**
 * A decorator that looks like the `property` decorator exported by
 * `lit/decorators.js`, but isn't because it's in a different module (and
 * doesn't do anything).
 */
export const property =
  (options?: unknown) => (_protoOrDescriptor: unknown, _name: string) => {
    console.log(options);
  };

/**
 * A function that looks like the Lit `html` function, but isn't.
 */
export const html = (_strings: TemplateStringsArray, ..._values: unknown[]) =>
  '';
