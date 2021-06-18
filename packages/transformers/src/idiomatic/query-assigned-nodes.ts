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
 *   @queryAssignedNodes('list')
 *   listItems
 *
 * Into:
 *
 *   get listItems() {
 *     return this.renderRoot
 *       ?.querySelector('slot[name=list]')
 *       ?.assignedNodes();
 *   }
 */
export class QueryAssignedNodesVisitor implements MemberDecoratorVisitor {
  readonly kind = 'memberDecorator';
  readonly decoratorName = 'queryAssignedNodes';

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
    const [arg0, arg1, arg2] = decorator.expression.arguments;
    const slotName =
      arg0 !== undefined && ts.isStringLiteral(arg0) ? arg0.text : '';
    const flatten = arg1?.kind === ts.SyntaxKind.TrueKeyword;
    const selector =
      arg2 !== undefined && ts.isStringLiteral(arg2) ? arg2.text : '';
    litClassContext.litFileContext.nodesToRemove.add(property);
    litClassContext.classMembers.push(
      this._createQueryAssignedNodesGetter(name, slotName, flatten, selector)
    );
  }

  private _createQueryAssignedNodesGetter(
    name: string,
    slotName: string,
    flatten: boolean,
    selector: string
  ) {
    const f = this._factory;

    const slotSelector = `slot${
      slotName ? `[name=${slotName}]` : ':not([name])'
    }`;

    // {flatten: true}
    const assignedNodesOptions = flatten
      ? [
          f.createObjectLiteralExpression(
            [
              f.createPropertyAssignment(
                f.createIdentifier('flatten'),
                f.createTrue()
              ),
            ],
            false
          ),
        ]
      : [];

    // this.renderRoot?.querySelector(<selector>)?.assignedNodes(<options>)
    const assignedNodes = f.createCallChain(
      f.createPropertyAccessChain(
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
          [f.createStringLiteral(slotSelector)]
        ),
        f.createToken(ts.SyntaxKind.QuestionDotToken),
        f.createIdentifier('assignedNodes')
      ),
      undefined,
      undefined,
      assignedNodesOptions
    );

    const returnExpression = !selector
      ? assignedNodes
      : // <assignedNodes>?.filter((node) =>
        //   node.nodeType === Node.ELEMENT_NODE &&
        //     node.matches(<selector>)
        f.createCallChain(
          f.createPropertyAccessChain(
            assignedNodes,
            f.createToken(ts.SyntaxKind.QuestionDotToken),
            f.createIdentifier('filter')
          ),
          undefined,
          undefined,
          [
            f.createArrowFunction(
              undefined,
              undefined,
              [
                f.createParameterDeclaration(
                  undefined,
                  undefined,
                  undefined,
                  f.createIdentifier('node'),
                  undefined,
                  undefined,
                  undefined
                ),
              ],
              undefined,
              f.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
              f.createBinaryExpression(
                f.createBinaryExpression(
                  f.createPropertyAccessExpression(
                    f.createIdentifier('node'),
                    f.createIdentifier('nodeType')
                  ),
                  f.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
                  f.createPropertyAccessExpression(
                    f.createIdentifier('Node'),
                    f.createIdentifier('ELEMENT_NODE')
                  )
                ),
                f.createToken(ts.SyntaxKind.AmpersandAmpersandToken),
                f.createCallExpression(
                  f.createPropertyAccessExpression(
                    f.createIdentifier('node'),
                    f.createIdentifier('matches')
                  ),
                  undefined,
                  [f.createStringLiteral(selector)]
                )
              )
            ),
          ]
        );

    // { return <returnExpression> }
    const getterBody = f.createBlock(
      [f.createReturnStatement(returnExpression)],
      true
    );

    return f.createGetAccessorDeclaration(
      undefined,
      undefined,
      f.createIdentifier(name),
      [],
      undefined,
      getterBody
    );
  }
}
