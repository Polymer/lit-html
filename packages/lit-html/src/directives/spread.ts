/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {noChange, nothing, _Σ as litHtmlPrivate} from '../lit-html.js';
import {
  directive,
  Directive,
  DirectiveParameters,
  PartInfo,
  PartType,
  Part,
  ElementPart,
} from '../directive.js';

const {
  _AttributePart: AttributePartImpl,
  _PropertyPart: PropertyPartImpl,
  _BooleanAttributePart: BooleanAttributePartImpl,
  _EventPart: EventPartImpl,
  // _ElementPart: ElementPartImpl,
} = litHtmlPrivate;

export interface SpreadValues {
  readonly [name: string]: unknown;
}

class SpreadDirective extends Directive {
  _previousValues: Set<string> = new Set();
  _parts = new Map<string, Part>();

  constructor(partInfo: PartInfo) {
    super(partInfo);
    if (partInfo.type !== PartType.ELEMENT) {
      throw new Error(
        'The `spread` directive must be used al element expression'
      );
    }
  }

  render(_values: SpreadValues) {
    // TODO for SSR
    throw new Error('Not implemented');
  }

  update(elementPart: ElementPart, [values]: DirectiveParameters<this>) {
    // Remove old properties that no longer exist in styleInfo
    // We use forEach() instead of for-of so that re don't require down-level
    // iteration.
    const {element} = elementPart;
    this._parts!.forEach((part, name) => {
      // If the name isn't in values or it's null/undefined
      if (values[name] == null) {
        // Clear the part, which will remove attributes and disconnect directives
        part._$setValue(nothing);
        // Remove the part
        this._parts!.delete(name);
      }
    });

    // Add or update properties
    for (const name in values) {
      const value = values[name];
      if (value != null) {
        let part = this._parts.get(name);
        if (part === undefined) {
          const m = /([.?@])?(.*)/.exec(name)!;
          const ctor =
            m[1] === '.'
              ? PropertyPartImpl
              : m[1] === '?'
              ? BooleanAttributePartImpl
              : m[1] === '@'
              ? EventPartImpl
              : AttributePartImpl;
          this._parts.set(
            name,
            (part = new ctor(
              element,
              m[2],
              ['', ''],
              elementPart,
              elementPart.options
            ))
          );
        }
        part._$setValue(value);
      }
    }
    return noChange;
  }
}

/**
 */
export const spread = directive(SpreadDirective);

/**
 * The type of the class that powers this directive. Necessary for naming the
 * directive's return type.
 */
export type {SpreadDirective};
