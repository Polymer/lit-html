/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

/*
 * IMPORTANT: For compatibility with tsickle and the Closure JS compiler, all
 * property decorators (but not class decorators) in this file that have
 * an @ExportDecoratedItems annotation must be defined as a regular function,
 * not an arrow function.
 */
import {PropertyDeclaration, ReactiveElement} from '../reactive-element.js';
import {ClassElement} from './base.js';

const standardProperty = (
  options: PropertyDeclaration,
  element: ClassElement
) => {
  // When decorating an accessor, pass it through and add property metadata.
  // Note, the `hasOwnProperty` check in `createProperty` ensures we don't
  // stomp over the user's accessor.
  if (
    element.kind === 'method' &&
    element.descriptor &&
    !('value' in element.descriptor)
  ) {
    return {
      ...element,
      finisher(clazz: typeof ReactiveElement) {
        clazz.createProperty(element.key, options);
      },
    };
  } else {
    // createProperty() takes care of defining the property, but we still
    // must return some kind of descriptor, so return a descriptor for an
    // unused prototype field. The finisher calls createProperty().
    return {
      kind: 'field',
      key: Symbol(),
      placement: 'own',
      descriptor: {},
      // store the original key so subsequent decorators have access to it.
      originalKey: element.key,
      // When @babel/plugin-proposal-decorators implements initializers,
      // do this instead of the initializer below. See:
      // https://github.com/babel/babel/issues/9260 extras: [
      //   {
      //     kind: 'initializer',
      //     placement: 'own',
      //     initializer: descriptor.initializer,
      //   }
      // ],
      initializer(this: {[key: string]: unknown}) {
        if (typeof element.initializer === 'function') {
          this[element.key as string] = element.initializer.call(this);
        }
      },
      finisher(clazz: typeof ReactiveElement) {
        clazz.createProperty(element.key, options);
      },
    };
  }
};

const legacyProperty = (
  options: PropertyDeclaration,
  proto: unknown,
  name: PropertyKey
) => {
  ((proto as Record<string, unknown>)
    .constructor as typeof ReactiveElement).createProperty(name, options);
};

/**
 * A property decorator which creates a reactive property that reflects a
 * corresponding attribute value. When a decorated property is set
 * the element will update and render. A [[`PropertyDeclaration`]] may
 * optionally be supplied to configure property features.
 *
 * This decorator should only be used for public fields. As public fields,
 * properties should be considered as primarily settable by element users,
 * either via attribute or the property itself.
 *
 * Generally, properties that are changed by the element should be private or
 * protected fields and should use the [[`state`]] decorator.
 *
 * However, sometimes element code does need to set a public property. This
 * should typically only be done in response to user interaction, and an event
 * should be fired informing the user; for example, a checkbox sets its
 * `checked` property when clicked and fires a `changed` event. Mutating public
 * properties should typically not be done for non-primitive (object or array)
 * properties. In other cases when an element needs to manage state, a private
 * property decorated via the [[`state`]] decorator should be used. When needed,
 * state properties can be initialized via public properties to facilitate
 * complex interactions.
 *
 * @example
 * ```ts
 * class MyElement {
 *   @property({ type: Boolean })
 *   clicked = false;
 * }
 * ```
 * @category Decorator
 * @ExportDecoratedItems
 */
export function property(options?: PropertyDeclaration) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (protoOrDescriptor: unknown | ClassElement, name?: PropertyKey): any =>
    name !== undefined
      ? legacyProperty(options!, protoOrDescriptor, name)
      : standardProperty(options!, protoOrDescriptor as ClassElement);
}
