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
 *   @queryAll('.myInput')
 *   inputs
 *
 * Into:
 *
 *   get inputs() {
 *     return this.renderRoot?.queryAll('.myInput');
 *   }
 */
export class QueryAllVisitor implements MemberDecoratorVisitor {
  readonly kind = 'memberDecorator';
  readonly decoratorName = 'queryAll';

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
    if (!ts.isStringLiteral(arg0)) {
      return;
    }
    if (!ts.isIdentifier(property.name)) {
      return;
    }
    const name = property.name.text;
    const selector = arg0.text;
    litClassContext.litFileContext.nodesToRemove.add(property);
    litClassContext.classMembers.push(
      this._createQueryAllGetter(name, selector)
    );
  }

  private _createQueryAllGetter(name: string, selector: string) {
    const f = this._factory;
    return f.createGetAccessorDeclaration(
      undefined,
      undefined,
      f.createIdentifier(name),
      [],
      undefined,
      f.createBlock(
        [
          f.createReturnStatement(
            f.createCallChain(
              f.createPropertyAccessChain(
                f.createPropertyAccessExpression(
                  f.createThis(),
                  f.createIdentifier('renderRoot')
                ),
                f.createToken(ts.SyntaxKind.QuestionDotToken),
                f.createIdentifier('querySelectorAll')
              ),
              undefined,
              undefined,
              [f.createStringLiteral(selector)]
            )
          ),
        ],
        true
      )
    );
  }
}
