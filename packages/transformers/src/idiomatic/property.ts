/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import * as ts from 'typescript';

import type {LitClassContext} from '../lit-class-context.js';
import type {MemberDecoratorVisitor} from '../visitor.js';

/**
 * Transform:
 *
 *   @property({type: Number})
 *   foo
 *
 * Into:
 *
 *   static get properties() {
 *     return {
 *       foo: {type: Number}
 *     }
 *   }
 */
export class PropertyVisitor implements MemberDecoratorVisitor {
  readonly kind = 'memberDecorator';
  readonly decoratorName = 'property';

  constructor(_context: ts.TransformationContext) {}

  visit(
    litClassContext: LitClassContext,
    property: ts.ClassElement,
    decorator: ts.Decorator
  ) {
    if (!ts.isPropertyDeclaration(property)) {
      return;
    }
    if (!ts.isCallExpression(decorator.expression)) {
      return;
    }
    const [options] = decorator.expression.arguments;
    if (!(options === undefined || ts.isObjectLiteralExpression(options))) {
      return;
    }
    if (!ts.isIdentifier(property.name)) {
      return;
    }
    const name = property.name.text;
    litClassContext.litFileContext.nodesToRemove.add(decorator);
    litClassContext.reactiveProperties.push({name, options});
  }
}
