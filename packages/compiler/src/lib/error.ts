/**
 * @license
 * Copyright (c) 2020 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt The complete set of authors may be found
 * at http://polymer.github.io/AUTHORS.txt The complete set of contributors may
 * be found at http://polymer.github.io/CONTRIBUTORS.txt Code distributed by
 * Google as part of the polymer project is also subject to an additional IP
 * rights grant found at http://polymer.github.io/PATENTS.txt
 */

/**
 * If we throw this error class, we know it was an expected error and can print
 * a concise error instead of a stacktrace.
 */
export class KnownError extends Error {}

/**
 * Fail type checking if the first argument is not `never`, and throw a
 * `KnownError` with the given message if this function is somehow called
 * anyway.
 */
export function throwUnreachable(_x: never, msg: string) {
  throw new KnownError(msg);
}
