/**
 * @license
 * Copyright (c) 2020 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt The complete set of authors may be found
 * at http://polymer.github.io/AUTHORS.txt The complete set of contributors may
 * be found at http://polymer.github.io/CONTRIBUTORS.txt Code distributed by
 * Google as part of the polymer project is also subject to an additional IP
 * rights grant found at http://polymer.github.io/PATENTS.txt
 */

import ts from 'typescript';
import * as path from 'path';
import {KnownError} from './error.js';

/**
 * Set up a TypeScript API program given a tsconfig.json filepath.
 */
export function programFromTsConfig(tsConfigPath: string): ts.Program {
  const {config, error} = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
  if (error) {
    // TODO(aomarks) Set up proper TypeScript diagnostics reporting here too.
    throw new KnownError(JSON.stringify(error));
  }
  const parsedCommandLine = ts.parseJsonConfigFileContent(
    config,
    ts.sys,
    path.dirname(tsConfigPath)
  );
  if (parsedCommandLine.errors.length > 0) {
    throw new KnownError(
      parsedCommandLine.errors.map((error) => JSON.stringify(error)).join('\n')
    );
  }
  const {fileNames, options} = parsedCommandLine;
  const program = ts.createProgram(fileNames, options);
  return program;
}

/**
 * Create a TypeScript diagnostic object for error reporting.
 */
export function createDiagnostic(
  file: ts.SourceFile,
  node: ts.Node,
  message: string,
  relatedInformation?: ts.DiagnosticRelatedInformation[]
): ts.DiagnosticWithLocation {
  return {
    file,
    start: node.getStart(file),
    length: node.getWidth(file),
    category: ts.DiagnosticCategory.Error,
    code: 2324, // Fairly meaningless but reasonably unique number.
    messageText: message,
    source: 'localization-generate',
    relatedInformation,
  };
}

/**
 * Nicely log an error for the given TypeScript diagnostic object.
 */
export function printDiagnostics(diagnostics: ts.Diagnostic[]): void {
  console.error(
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName(name: string) {
        return name;
      },
      getCurrentDirectory() {
        return process.cwd();
      },
      getNewLine() {
        return '\n';
      },
    })
  );
}

/**
 * Escape a string such that it can be safely embedded in a JavaScript template
 * literal (backtick string).
 */
export function escapeStringToEmbedInTemplateLiteral(
  unescaped: string
): string {
  return unescaped
    .replace(/\\/g, `\\\\`)
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');
}
