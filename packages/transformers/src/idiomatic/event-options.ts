/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import * as ts from 'typescript';
import {cloneNode} from 'ts-clone-node';

import type {LitElementMutations} from '../mutations.js';
import type {MemberDecoratorVisitor, GenericVisitor} from '../visitor.js';
import type {LitFileContext} from '../lit-file-context.js';

/**
 * Transform:
 *
 *   class MyElement extends LitElement {
 *
 *     @eventOptions({capture: true})
 *     private _onClick(event) {
 *       console.log('click', event.target);
 *     }
 *
 *     @eventOptions({passive: true})
 *     public onKeydown(event) {
 *       console.log('keydown', event.target);
 *     }
 *
 *     render() {
 *       return html`
 *         <button @click=${this._onClick}
 *                 @keydown=${this.onKeydown}>
 *           Foo
 *         </button>`;
 *     }
 *   }
 *
 * Into:
 *
 *   class MyElement extends LitElement {
 *
 *     _onClick(event) {
 *       console.log('click', event.target);
 *     }
 *
 *     onKeydown(event) {
 *       console.log('keydown', event.target);
 *     }
 *
 *     render() {
 *       return html`
 *         <button @click=${{handleEvent: (e) => this._onClick(e), capture: true}}
 *                 @keydown=${this.onKeydown}>
 *           Foo
 *         </button>
 *       `;
 *     }
 *   }
 *   Object.assign(MyElement.prototype.onKeydown, {passive: true});
 */
export class EventOptionsVisitor implements MemberDecoratorVisitor {
  readonly kind = 'memberDecorator';
  readonly decoratorName = 'eventOptions';

  private _factory: ts.NodeFactory;
  private _program: ts.Program;

  constructor({factory}: ts.TransformationContext, program: ts.Program) {
    this._factory = factory;
    this._program = program;
  }

  visit(
    mutations: LitElementMutations,
    method: ts.ClassElement,
    decorator: ts.Decorator,
    litFileContext: LitFileContext
  ) {
    if (!ts.isMethodDeclaration(method)) {
      return;
    }
    if (!ts.isCallExpression(decorator.expression)) {
      return;
    }
    if (!method.body) {
      return;
    }
    const [options] = decorator.expression.arguments;
    if (!ts.isObjectLiteralExpression(options)) {
      return;
    }
    if (!ts.isIdentifier(method.name)) {
      return;
    }
    if (!ts.isClassLike(method.parent) || method.parent.name === undefined) {
      return;
    }

    mutations.removeNodes.add(decorator);

    // If private, assume no outside access is possible, and transform any
    // references to this function inside template event bindings to
    // `{handleEvent: (e) => this._onClick(e), ...options}` objects.
    if (
      method.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.PrivateKeyword)
    ) {
      const methodSymbol = this._program
        .getTypeChecker()
        .getSymbolAtLocation(method.name);
      if (methodSymbol !== undefined) {
        mutations.visitors.add(
          new EventOptionsBindingVisitor(
            this._factory,
            this._program,
            methodSymbol,
            options,
            litFileContext
          )
        );
        return;
      }
    }

    // If not private, keep the method as it is and annotate options on it
    // directly, exactly like the decorator does.
    mutations.adjacentStatements.push(
      this._createMethodOptionsAssignment(
        method.parent.name.text,
        method.name.text,
        options
      )
    );
  }

  private _createMethodOptionsAssignment(
    className: string,
    methodName: string,
    options: ts.ObjectLiteralExpression
  ): ts.Node {
    const f = this._factory;
    return f.createCallExpression(
      f.createPropertyAccessExpression(
        f.createIdentifier('Object'),
        f.createIdentifier('assign')
      ),
      undefined,
      [
        f.createPropertyAccessExpression(
          f.createPropertyAccessExpression(
            f.createIdentifier(className),
            f.createIdentifier('prototype')
          ),
          f.createIdentifier(methodName)
        ),
        cloneNode(options, {factory: this._factory}),
      ]
    );
  }
}

class EventOptionsBindingVisitor implements GenericVisitor {
  readonly kind = 'generic';

  private _factory: ts.NodeFactory;
  private _symbol: ts.Symbol;
  private _program: ts.Program;
  private _optionsNode: ts.ObjectLiteralExpression;
  private _litFileContext: LitFileContext;

  constructor(
    factory: ts.NodeFactory,
    program: ts.Program,
    methodSymbol: ts.Symbol,
    optionsNode: ts.ObjectLiteralExpression,
    litFileContext: LitFileContext
  ) {
    this._factory = factory;
    this._program = program;
    this._symbol = methodSymbol;
    this._optionsNode = optionsNode;
    this._litFileContext = litFileContext;
  }

  visit(node: ts.Node): ts.Node {
    if (!ts.isPropertyAccessExpression(node)) {
      return node;
    }
    if (node.parent === undefined || !this._isLitEventBinding(node.parent)) {
      return node;
    }
    const symbol = this._program
      .getTypeChecker()
      .getSymbolAtLocation(node.name);
    if (symbol !== this._symbol) {
      return node;
    }
    return this._createEventHandlerObject(node);
  }

  private _isLitEventBinding(span: ts.Node) {
    if (!ts.isTemplateSpan(span)) {
      return false;
    }
    const template = span.parent;
    if (template === undefined || !ts.isTemplateExpression(template)) {
      return false;
    }
    const tagged = template.parent;
    if (!ts.isTaggedTemplateExpression(tagged)) {
      return false;
    }
    const pos = template.templateSpans.indexOf(span as ts.TemplateSpan);
    if (pos === -1) {
      return false;
    }
    const priorText =
      pos === 0
        ? template.head.text
        : template.templateSpans[pos - 1].literal.text;
    // TODO(aomarks) Check this regexp more thoroughly.
    if (priorText.match(/@[^\s"'>]+\s*=\s*["']*$/) === null) {
      return false;
    }
    // Note we check for the lit tag last because it requires the type checker
    // which is expensive.
    if (this._litFileContext.getCanonicalName(tagged.tag) !== 'html') {
      return false;
    }
    return true;
  }

  private _createEventHandlerObject(
    node: ts.PropertyAccessExpression
  ): ts.ObjectLiteralExpression {
    const f = this._factory;
    return f.createObjectLiteralExpression(
      [
        f.createPropertyAssignment(
          f.createIdentifier('handleEvent'),
          f.createArrowFunction(
            undefined,
            undefined,
            [
              f.createParameterDeclaration(
                undefined,
                undefined,
                undefined,
                f.createIdentifier('e'),
                undefined,
                undefined,
                undefined
              ),
            ],
            undefined,
            f.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
            f.createCallExpression(
              cloneNode(node, {factory: this._factory}),
              undefined,
              [f.createIdentifier('e')]
            )
          )
        ),
        ...this._optionsNode.properties.map((property) =>
          cloneNode(property, {factory: this._factory})
        ),
      ],
      false
    );
  }
}
