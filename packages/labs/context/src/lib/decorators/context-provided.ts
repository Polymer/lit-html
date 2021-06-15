/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {ReactiveElement} from '@lit/reactive-element';
import {decorateProperty} from '@lit/reactive-element/decorators/base.js';
import {ContextConsumer} from '../controllers/context-consumer';
import {Context} from '../create-context';

/*
 * IMPORTANT: For compatibility with tsickle and the Closure JS compiler, all
 * property decorators (but not class decorators) in this file that have
 * an @ExportDecoratedItems annotation must be defined as a regular function,
 * not an arrow function.
 */

/**
 * A property decorator that adds a ContextConsumer controller to the component
 * which will try and retrieve a value for the property via the Context API.
 *
 * @param context A Context identifier value created via `createContext`
 * @param multiple An optional boolean which when true allows the value to be updated
 *   multiple times.
 *
 * See: https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector
 *
 * @example
 *
 * ```ts
 * import {loggerContext} from 'community-protocols/logger';
 *
 * class MyElement {
 *   @contextProvided(loggerContext)
 *   logger;
 *
 *   doThing() {
 *     this.logger.log('thing was done');
 *   }
 * }
 * ```
 * @category Decorator
 */
export function contextProvided<V>({
  context,
  multiple,
}: {
  context: Context<V>;
  multiple?: boolean;
}): <K extends PropertyKey>(
  protoOrDescriptor: ReactiveElement & Record<K, V>,
  name?: K
  // Note TypeScript requires the return type to be `void|any`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => void | any {
  return decorateProperty({
    finisher: (ctor: typeof ReactiveElement, name: PropertyKey) => {
      ctor.addInitializer((element: ReactiveElement): void => {
        element.addController(
          new ContextConsumer(
            element,
            context,
            (value: V) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- have to force the property on the type
              (element as any)[name] = value;
            },
            multiple
          )
        );
      });
    },
  });
}
