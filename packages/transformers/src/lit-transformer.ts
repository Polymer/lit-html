/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import * as ts from 'typescript';
import {LitClassContext} from './lit-class-context.js';
import {LitFileContext} from './lit-file-context.js';
import {cloneNode} from 'ts-clone-node';

import type {
  Visitor,
  ClassDecoratorVisitor,
  MemberDecoratorVisitor,
  GenericVisitor,
} from './visitor.js';

const unreachable = (x: never) => x;

/**
 * Configurable transformer for Lit.
 */
export class LitTransformer {
  private readonly _context: ts.TransformationContext;
  private readonly _classDecoratorVisitors = new MultiMap<
    string,
    ClassDecoratorVisitor
  >();
  private readonly _memberDecoratorVisitors = new MultiMap<
    string,
    MemberDecoratorVisitor
  >();
  private readonly _genericVisitors = new Set<GenericVisitor>();
  private readonly _litFileContext: LitFileContext;

  constructor(
    program: ts.Program,
    context: ts.TransformationContext,
    visitors: Array<Visitor>
  ) {
    this._context = context;
    this._litFileContext = new LitFileContext(program);
    for (const visitor of visitors) {
      this._registerVisitor(visitor);
    }
  }

  private _registerVisitor(visitor: Visitor) {
    switch (visitor.kind) {
      case 'classDecorator': {
        this._classDecoratorVisitors.add(visitor.decoratorName, visitor);
        break;
      }
      case 'memberDecorator': {
        this._memberDecoratorVisitors.add(visitor.decoratorName, visitor);
        break;
      }
      case 'generic': {
        this._genericVisitors.add(visitor);
        break;
      }
      default: {
        throw new Error(
          `Internal error: registering unknown visitor kind ${
            (unreachable(visitor) as Visitor).kind
          }`
        );
      }
    }
  }

  private _unregisterVisitor(visitor: Visitor) {
    switch (visitor.kind) {
      case 'classDecorator': {
        this._classDecoratorVisitors.delete(visitor.decoratorName, visitor);
        break;
      }
      case 'memberDecorator': {
        this._memberDecoratorVisitors.delete(visitor.decoratorName, visitor);
        break;
      }
      case 'generic': {
        this._genericVisitors.delete(visitor);
        break;
      }
      default: {
        throw new Error(
          `Internal error: unregistering unknown visitor kind ${
            (unreachable(visitor) as Visitor).kind
          }`
        );
      }
    }
  }

  visitFile = (node: ts.Node): ts.VisitResult<ts.Node> => {
    if (!ts.isSourceFile(node)) {
      return node;
    }
    let traversalNeeded = false;
    for (const statement of node.statements) {
      if (ts.isImportDeclaration(statement)) {
        traversalNeeded ||= this._analyzeImportDeclaration(statement);
      }
    }
    if (!traversalNeeded) {
      // No relevant transforms could apply, we can ignore this file.
      return node;
    }
    node = ts.visitEachChild(node, this.visit, this._context);
    this._litFileContext.clear();
    return node;
  };

  visit = (node: ts.Node): ts.VisitResult<ts.Node> => {
    if (this._litFileContext.nodesToRemove.delete(node)) {
      return undefined;
    }
    for (const visitor of this._genericVisitors) {
      node = visitor.visit(this._litFileContext, node);
    }
    if (ts.isImportDeclaration(node)) {
      return this._visitImportDeclaration(node);
    }
    if (ts.isClassDeclaration(node)) {
      return this._visitClassDeclaration(node);
    }
    return ts.visitEachChild(node, this.visit, this._context);
  };

  /**
   * Check the given import declaration to see if it imports any symbols from
   * Lit modules that apply to the configured visitors. Return whether or not a
   * relevant import was found.
   */
  private _analyzeImportDeclaration(node: ts.ImportDeclaration): boolean {
    if (!ts.isStringLiteral(node.moduleSpecifier)) {
      return false;
    }
    const specifier = node.moduleSpecifier.text;
    if (
      !(
        specifier === 'lit' ||
        specifier.startsWith('lit/') ||
        specifier === 'lit-element' ||
        specifier.startsWith('lit-element/') ||
        specifier === '@lit/reactive-element' ||
        specifier.startsWith('@lit/reactive-element/')
      )
    ) {
      return false;
    }

    // TODO(aomarks) Maybe handle NamespaceImport (import * as decorators).
    const bindings = node.importClause?.namedBindings;
    if (bindings == undefined || !ts.isNamedImports(bindings)) {
      return false;
    }

    let traversalNeeded = false;
    for (const importSpecifier of bindings.elements) {
      // Name as exported (Lit's name for it, not whatever the alias is).
      const realName =
        importSpecifier.propertyName?.text ?? importSpecifier.name.text;
      if (realName === 'html') {
        this._litFileContext.litImports.set(importSpecifier, realName);
        // TODO(aomarks) We don't set traversalNeeded for the html tag import,
        // because we don't currently have any transforms that aren't already
        // associated with a decorator. If that changed, visitors should
        // probably have a static field to declare which imports they care
        // about.
      } else if (
        // Only handle the decorators we're configured to transform.
        this._classDecoratorVisitors.has(realName) ||
        this._memberDecoratorVisitors.has(realName)
      ) {
        this._litFileContext.litImports.set(importSpecifier, realName);
        // Assume if there's a visitor for a decorator, it's always going to
        // remove any uses of that decorator, and hence we should remove the
        // import too.
        this._litFileContext.nodesToRemove.add(importSpecifier);
        traversalNeeded = true;
      }
    }
    return traversalNeeded;
  }

  private _visitImportDeclaration(node: ts.ImportDeclaration) {
    const pruned = ts.visitEachChild(node, this.visit, this._context);
    return (pruned.importClause?.namedBindings as ts.NamedImports).elements
      .length > 0
      ? pruned
      : // Remove the import altogether if there are no remaining bindings.
        undefined;
  }

  private _visitClassDeclaration(class_: ts.ClassDeclaration) {
    const litClassContext = new LitClassContext(this._litFileContext, class_);

    // Class decorators
    for (const decorator of class_.decorators ?? []) {
      if (!ts.isCallExpression(decorator.expression)) {
        continue;
      }
      const decoratorName = this._litFileContext.getCanonicalName(
        decorator.expression.expression
      );
      if (decoratorName === undefined) {
        continue;
      }
      const visitors = this._classDecoratorVisitors.get(decoratorName) ?? [];
      for (const visitor of visitors) {
        visitor.visit(litClassContext, decorator);
      }
    }

    // Class member decorators
    for (const member of class_.members ?? []) {
      for (const decorator of member.decorators ?? []) {
        if (!ts.isCallExpression(decorator.expression)) {
          continue;
        }
        const decoratorName = this._litFileContext.getCanonicalName(
          decorator.expression.expression
        );
        if (decoratorName === undefined) {
          continue;
        }
        const visitors = this._memberDecoratorVisitors.get(decoratorName) ?? [];
        for (const visitor of visitors) {
          visitor.visit(litClassContext, member, decorator);
        }
      }
    }

    if (litClassContext.reactiveProperties.length > 0) {
      const existing = this._findExistingStaticProperties(class_);
      if (existing !== undefined) {
        this._litFileContext.nodesToRemove.add(existing.getter);
      }
      litClassContext.classMembers.unshift(
        this._createStaticProperties(
          existing?.properties,
          litClassContext.reactiveProperties
        )
      );
    }

    for (const visitor of litClassContext.additionalClassVisitors) {
      this._registerVisitor(visitor);
    }

    // Note we do need to `ts.visitEachChild` here, because [1] there might be
    // nodes that still need to be deleted via `this._nodesToRemove` (e.g. a
    // property decorator or a property itself), and [2] in theory there could
    // be a nested custom element definition somewhere in this class.
    const transformedClass = ts.visitEachChild(
      this._context.factory.updateClassDeclaration(
        class_,
        class_.decorators,
        class_.modifiers,
        class_.name,
        class_.typeParameters,
        class_.heritageClauses,
        [...litClassContext.classMembers, ...class_.members]
      ),
      this.visit,
      this._context
    );

    // These visitors only apply within the scope of the current class.
    for (const visitor of litClassContext.additionalClassVisitors) {
      this._unregisterVisitor(visitor);
    }

    return [transformedClass, ...litClassContext.adjacentStatements];
  }

  /**
   * Create the AST from e.g. `@property({type: String}) myProperty`:
   *
   *   static get properties() {
   *     return {
   *       myProperty: { type: String },
   *       ...
   *     }
   *   }
   */
  private _createStaticProperties(
    existingProperties: ts.NodeArray<ts.ObjectLiteralElementLike> | undefined,
    newProperties: Array<{name: string; options?: ts.ObjectLiteralExpression}>
  ) {
    const f = this._context.factory;
    const properties = [
      ...(existingProperties
        ? existingProperties.map((prop) =>
            cloneNode(prop, {factory: this._context.factory})
          )
        : []),
      ...newProperties.map(({name, options}) =>
        f.createPropertyAssignment(
          f.createIdentifier(name),
          options ? options : f.createObjectLiteralExpression([], false)
        )
      ),
    ];
    return f.createGetAccessorDeclaration(
      undefined,
      [f.createModifier(ts.SyntaxKind.StaticKeyword)],
      f.createIdentifier('properties'),
      [],
      undefined,
      f.createBlock(
        [
          f.createReturnStatement(
            f.createObjectLiteralExpression(properties, true)
          ),
        ],
        true
      )
    );
  }

  private _findExistingStaticProperties(class_: ts.ClassDeclaration):
    | {
        getter: ts.ClassElement;
        properties: ts.NodeArray<ts.ObjectLiteralElementLike>;
      }
    | undefined {
    const getter = class_.members.find(
      (member) =>
        ts.isGetAccessor(member) &&
        ts.isIdentifier(member.name) &&
        member.name.text === 'properties'
    );
    if (
      getter === undefined ||
      !ts.isGetAccessorDeclaration(getter) ||
      getter.body === undefined
    ) {
      return undefined;
    }
    const returnStatement = getter.body.statements[0];
    if (
      returnStatement === undefined ||
      !ts.isReturnStatement(returnStatement)
    ) {
      return undefined;
    }
    const objectLiteral = returnStatement.expression;
    if (
      objectLiteral === undefined ||
      !ts.isObjectLiteralExpression(objectLiteral)
    ) {
      return undefined;
    }
    return {getter, properties: objectLiteral.properties};
  }
}

/**
 * Maps from a key to a Set of values.
 */
class MultiMap<K, V> {
  private readonly _map = new Map<K, Set<V>>();

  get(key: K): Set<V> | undefined {
    return this._map.get(key);
  }

  has(key: K): boolean {
    return this._map.has(key);
  }

  get size(): number {
    return this._map.size;
  }

  add(key: K, val: V) {
    let set = this._map.get(key);
    if (set === undefined) {
      set = new Set();
      this._map.set(key, set);
    }
    set.add(val);
  }

  delete(key: K, val: V) {
    const set = this._map.get(key);
    if (set === undefined) {
      return;
    }
    if (set.delete(val) && set.size === 0) {
      this._map.delete(key);
    }
  }
}
