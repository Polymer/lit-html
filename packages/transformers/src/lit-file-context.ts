/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import * as ts from 'typescript';

/**
 * State scoped to one module that contains Lit code.
 */
export class LitFileContext {
  /**
   * Maps from a Lit module ImportSpecifier to the canonical name within the Lit
   * packages for that export.
   */
  readonly litImports = new Map<ts.ImportSpecifier, string>();

  /**
   * Nodes that are to be removed from the AST if they are encountered in
   * subsequent traversal.
   */
  readonly nodesToRemove = new Set<ts.Node>();

  private readonly _program: ts.Program;

  constructor(program: ts.Program) {
    this._program = program;
  }

  clear() {
    this.litImports.clear();
    this.nodesToRemove.clear();
  }

  /**
   * If the given node refers to a symbol imported from a Lit package, return
   * Lit's canonical name for that symbol.
   */
  getCanonicalName(node: ts.Node): string | undefined {
    const symbol = this._program.getTypeChecker().getSymbolAtLocation(node);
    const firstDeclaration = symbol?.declarations[0];
    if (
      firstDeclaration === undefined ||
      !ts.isImportSpecifier(firstDeclaration)
    ) {
      return undefined;
    }
    return this.litImports.get(firstDeclaration);
  }
}
