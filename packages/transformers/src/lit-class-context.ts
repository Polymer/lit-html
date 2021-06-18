/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type * as ts from 'typescript';
import type {LitFileContext} from './lit-file-context.js';
import type {Visitor} from './visitor.js';

/**
 * State scoped to one Lit class.
 */
export class LitClassContext {
  /**
   * The file state.
   */
  readonly litFileContext: LitFileContext;

  /**
   * The Lit class AST node.
   */
  readonly class: ts.ClassDeclaration;

  /**
   * Add a new class member to this element (e.g. a new getter).
   */
  readonly classMembers: ts.ClassElement[] = [];

  /**
   * Add a new property to the `static get properties` block of this element.
   */
  readonly reactiveProperties: Array<{
    name: string;
    options?: ts.ObjectLiteralExpression;
  }> = [];

  /**
   * Add a new statement that will be inserted into the AST immediately after
   * this element (e.g. a customElements.define() call).
   */
  readonly adjacentStatements: ts.Node[] = [];

  /**
   * Additional visitors that will run only in the scope of the current class.
   */
  readonly additionalClassVisitors = new Set<Visitor>();

  constructor(litFileContext: LitFileContext, class_: ts.ClassDeclaration) {
    this.litFileContext = litFileContext;
    this.class = class_;
  }
}
