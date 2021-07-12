/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {ChildPart, noChange} from '../lit-html.js';
import {directive, DirectiveParameters} from '../directive.js';
import {AsyncDirective} from '../async-directive.js';

type Mapper<T> = (v: T, index?: number) => unknown;

class AsyncReplaceDirective extends AsyncDirective {
  private _value?: AsyncIterable<unknown>;
  private _reconnectResolver?: () => void;
  private _reconnectPromise?: Promise<void>;

  // @ts-expect-error value not used, but we want a nice parameter for docs
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  render<T>(value: AsyncIterable<T>, _mapper?: Mapper<T>) {
    return noChange;
  }

  update(_part: ChildPart, [value, mapper]: DirectiveParameters<this>) {
    // If we've already set up this particular iterable, we don't need
    // to do anything.
    if (value === this._value) {
      return;
    }
    this._value = value;
    this.__iterate(mapper);
    return noChange;
  }

  // Separate function to avoid an iffe in update; update can't be async
  // because its return value must be `noChange`
  private async __iterate(mapper?: Mapper<unknown>) {
    let i = 0;
    const {_value: value} = this;
    for await (let v of value!) {
      // Check to make sure that value is the still the current value of
      // the part, and if not bail because a new value owns this part
      if (this._value !== value) {
        break;
      }

      // If we were disconnected, pause until reconnected
      if (this._reconnectPromise) {
        await this._reconnectPromise;
      }

      // As a convenience, because functional-programming-style
      // transforms of iterables and async iterables requires a library,
      // we accept a mapper function. This is especially convenient for
      // rendering a template for each item.
      if (mapper !== undefined) {
        v = mapper(v, i);
      }

      this.setValue(v);
      i++;
    }
  }

  disconnected() {
    // Pause iteration while disconnected
    this._reconnectPromise = new Promise(
      (resolve) => (this._reconnectResolver = resolve)
    );
  }

  reconnected() {
    // Resume iteration when reconnected
    this._reconnectPromise = undefined;
    this._reconnectResolver!();
  }
}

/**
 * A directive that renders the items of an async iterable[1], replacing
 * previous values with new values, so that only one value is ever rendered
 * at a time. This directive may be used in any expression type.
 *
 * Async iterables are objects with a `[Symbol.asyncIterator]` method, which
 * returns an iterator who's `next()` method returns a Promise. When a new
 * value is available, the Promise resolves and the value is rendered to the
 * Part controlled by the directive. If another value other than this
 * directive has been set on the Part, the iterable will no longer be listened
 * to and new values won't be written to the Part.
 *
 * [1]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of
 *
 * @param value An async iterable
 * @param mapper An optional function that maps from (value, index) to another
 *     value. Useful for generating templates for each item in the iterable.
 */
export const asyncReplace = directive(AsyncReplaceDirective);

/**
 * The type of the class that powers this directive. Necessary for naming the
 * directive's return type.
 */
export type {AsyncReplaceDirective};
