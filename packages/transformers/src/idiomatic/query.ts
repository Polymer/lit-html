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
 *   @query('#myDiv')
 *   div
 *
 *   @query('#mySpan', true)
 *   span
 *
 * Into:
 *
 *   get div() {
 *     return this.renderRoot?.querySelector('#myDiv');
 *   }
 *
 *   get span() {
 *     if (this.__span === undefined) {
 *       this.__span = this.renderRoot?.querySelector('#mySpan');
 *     }
 *     return this.__span;
 *   }
 */
export class QueryVisitor implements MemberDecoratorVisitor {
  readonly kind = 'memberDecorator';
  readonly decoratorName = 'query';

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
    const [arg0, arg1] = decorator.expression.arguments;
    if (!ts.isStringLiteral(arg0)) {
      return;
    }
    if (!ts.isIdentifier(property.name)) {
      return;
    }
    const name = property.name.text;
    const selector = arg0.text;
    const cache = arg1?.kind === ts.SyntaxKind.TrueKeyword;
    litClassContext.litFileContext.nodesToRemove.add(property);
    litClassContext.classMembers.push(
      cache
        ? this._createCachingQueryGetter(name, selector)
        : this._createNonCachingQueryGetter(name, selector)
    );
  }

  private _createNonCachingQueryGetter(name: string, selector: string) {
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
                f.createIdentifier('querySelector')
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

  private _createCachingQueryGetter(name: string, selector: string) {
    const f = this._factory;
    const internalName = `__${name}`;
    return f.createGetAccessorDeclaration(
      undefined,
      undefined,
      f.createIdentifier(name),
      [],
      undefined,
      f.createBlock(
        [
          f.createIfStatement(
            f.createBinaryExpression(
              f.createPropertyAccessExpression(
                f.createThis(),
                f.createIdentifier(internalName)
              ),
              f.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
              f.createIdentifier('undefined')
            ),
            f.createBlock(
              [
                f.createExpressionStatement(
                  f.createBinaryExpression(
                    f.createPropertyAccessExpression(
                      f.createThis(),
                      f.createIdentifier(internalName)
                    ),
                    f.createToken(ts.SyntaxKind.EqualsToken),
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
                      [f.createStringLiteral(selector)]
                    )
                  )
                ),
              ],
              true
            ),
            undefined
          ),
          f.createReturnStatement(
            f.createPropertyAccessExpression(
              f.createThis(),
              f.createIdentifier(internalName)
            )
          ),
        ],
        true
      )
    );
  }
}
