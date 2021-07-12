/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
import {nothing, ElementPart} from '../lit-html.js';
import {directive, AsyncDirective} from '../async-directive.js';

/**
 * Creates a new Ref object, which is container for a reference to an element.
 */
export const createRef = <T = Element>() => new Ref<T>();

/**
 * An object that holds a ref value.
 */
class Ref<T = Element> {
  /**
   * The current Element value of the ref, or else `undefined` if the ref is no
   * longer rendered.
   */
  readonly value?: T;
}

export type {Ref};

interface RefInternal {
  value: Element | undefined;
}

// When callbacks are used for refs, this map tracks the last value the callback
// was called with, for ensuring a directive doesn't clear the ref if the ref
// has already been rendered to a new spot
const lastElementForCallback: WeakMap<RefOrCallback, Element | undefined> =
  new WeakMap();

export type RefOrCallback = Ref | ((el: Element | undefined) => void);

class RefDirective extends AsyncDirective {
  private _element?: Element;
  private _ref?: RefOrCallback;
  private _context: unknown;

  render(_ref: RefOrCallback) {
    return nothing;
  }

  update(part: ElementPart, [ref]: Parameters<this['render']>) {
    const refChanged = ref !== this._ref;
    if (refChanged && this._ref !== undefined) {
      // The ref passed to the directive has changed;
      // unset the previous ref's value
      this._updateRefValue(undefined);
    }
    if (refChanged || this._lastElementForRef !== this._element) {
      // We either got a new ref or this is the first render;
      // store the ref/element & update the ref value
      this._ref = ref;
      this._context = part.options?.host;
      this._updateRefValue((this._element = part.element));
    }
    return nothing;
  }

  private _updateRefValue(element: Element | undefined) {
    if (typeof this._ref === 'function') {
      // If the current ref was called with a previous value, call with
      // `undefined`; We do this to ensure callbacks are called in a consistent
      // way regardless of whether a ref might be moving up in the tree (in
      // which case it would otherwise be called with the new value before the
      // previous one unsets it) and down in the tree (where it would be unset
      // before being set)
      if (lastElementForCallback.get(this._ref) !== undefined) {
        this._ref.call(this._context, undefined);
      }
      lastElementForCallback.set(this._ref, element);
      // Call the ref with the new element value
      if (element !== undefined) {
        this._ref.call(this._context, element);
      }
    } else {
      (this._ref as RefInternal)!.value = element;
    }
  }

  private get _lastElementForRef() {
    return typeof this._ref === 'function'
      ? lastElementForCallback.get(this._ref)
      : this._ref?.value;
  }

  disconnected() {
    // Only clear the box if our element is still the one in it (i.e. another
    // directive instance hasn't rendered its element to it before us); that
    // only happens in the event of the directive being cleared (not via manual
    // disconnection)
    if (this._lastElementForRef === this._element) {
      this._updateRefValue(undefined);
    }
  }

  reconnected() {
    // If we were manually disconnected, we can safely put our element back in
    // the box, since no rendering could have occurred to change its state
    this._updateRefValue(this._element);
  }
}

/**
 * Sets the value of a Ref object or calls a ref callback with the element it's
 * bound to.
 *
 * A Ref object acts as a container for a reference to an element. A ref
 * callback is a function that takes an element as its only argument.
 *
 * The ref directive sets the value of the Ref object or calls the ref callback
 * during rendering, if the referenced element changed.
 *
 * Note: If a ref callback is rendered to a different element position or is
 * removed in a subsequent render, it will first be called with `undefined`,
 * followed by another call with the new element it was rendered to (if any).
 *
 * @example
 *
 *    // Using Ref object
 *    const inputRef = createRef();
 *    render(html`<input ${ref(inputRef)}>`, container);
 *    inputRef.value.focus();
 *
 *    // Using callback
 *    const callback = (inputElement) => inputElement.focus();
 *    render(html`<input ${ref(callback)}>`, container);
 */
export const ref = directive(RefDirective);

/**
 * The type of the class that powers this directive. Necessary for naming the
 * directive's return type.
 */
export type {RefDirective};
