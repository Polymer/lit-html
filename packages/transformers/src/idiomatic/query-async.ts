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
 *   @queryAsync('#myButton')
 *   button
 *
 * Into:
 *
 *   async get button() {
 *     await this.updateComplete;
 *     return this.renderRoot?.querySelector('#myButton');
 *   }
 */
export class QueryAsyncVisitor implements MemberDecoratorVisitor {
  readonly kind = 'memberDecorator';
  readonly decoratorName = 'queryAsync';

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
    if (!ts.isIdentifier(property.name)) {
      return;
    }
    const name = property.name.text;
    const [arg0] = decorator.expression.arguments;
    if (!ts.isStringLiteral(arg0)) {
      return;
    }
    const selector = arg0.text;
    litClassContext.litFileContext.nodesToRemove.add(property);
    litClassContext.classMembers.push(
      this._createQueryAsyncGetter({name, selector})
    );
  }

  private _createQueryAsyncGetter(options: {name: string; selector: string}) {
    const f = this._factory;
    return f.createGetAccessorDeclaration(
      undefined,
      [f.createModifier(ts.SyntaxKind.AsyncKeyword)],
      f.createIdentifier(options.name),
      [],
      undefined,
      f.createBlock(
        [
          f.createExpressionStatement(
            f.createAwaitExpression(
              f.createPropertyAccessExpression(
                f.createThis(),
                f.createIdentifier('updateComplete')
              )
            )
          ),
          f.createReturnStatement(
            f.createCallChain(
              f.createPropertyAccessChain(
                f.createPropertyAccessExpression(
                  f.createThis(),
                  f.createIdentifier('renderRoot')
                ),
                f.createToken(ts.SyntaxKind.QuestionDotToken),
                f.createIdentifier('querySelector')
              ),
              undefined,
              undefined,
              [f.createStringLiteral(options.selector)]
            )
          ),
        ],
        true
      )
    );
  }
}
