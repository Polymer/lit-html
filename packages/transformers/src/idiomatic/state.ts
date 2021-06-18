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
 *   @state()
 *   foo
 *
 * Into:
 *
 *   static get properties() {
 *     return {
 *       foo: {state: true, attribute: false}
 *     }
 *   }
 */
export class StateVisitor implements MemberDecoratorVisitor {
  readonly kind = 'memberDecorator';
  readonly decoratorName = 'state';

  private readonly _factory: ts.NodeFactory;

  constructor({factory}: ts.TransformationContext) {
    this._factory = factory;
  }

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
    const [arg0] = decorator.expression.arguments;
    if (arg0 !== undefined && !ts.isObjectLiteralExpression(arg0)) {
      return;
    }
    if (!ts.isIdentifier(property.name)) {
      return;
    }

    const name = property.name.text;
    const options = this._createOptions(arg0);
    litClassContext.litFileContext.nodesToRemove.add(decorator);
    litClassContext.reactiveProperties.push({name, options});
  }

  private _createOptions(options: ts.ObjectLiteralExpression) {
    const f = this._factory;
    return f.createObjectLiteralExpression([
      ...(options !== undefined
        ? options.properties.filter((option) => {
            const name =
              option.name !== undefined && ts.isIdentifier(option.name)
                ? option.name.text
                : undefined;
            return !(name === 'state' || name === 'attribute');
          })
        : []),
      f.createPropertyAssignment(f.createIdentifier('state'), f.createTrue()),
      f.createPropertyAssignment(
        f.createIdentifier('attribute'),
        f.createFalse()
      ),
    ]);
  }
}
