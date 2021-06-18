/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import * as ts from 'typescript';

import {LitTransformer} from './lit-transformer.js';
import {CustomElementVisitor} from './idiomatic/custom-element.js';
import {PropertyVisitor} from './idiomatic/property.js';
import {StateVisitor} from './idiomatic/state.js';
import {QueryVisitor} from './idiomatic/query.js';
import {QueryAllVisitor} from './idiomatic/query-all.js';
import {QueryAsyncVisitor} from './idiomatic/query-async.js';
import {QueryAssignedNodesVisitor} from './idiomatic/query-assigned-nodes.js';
import {EventOptionsVisitor} from './idiomatic/event-options.js';

/**
 * TypeScript transformer which transforms all Lit decorators to their idiomatic
 * JavaScript style.
 *
 * Example input:
 *
 *   import {LitElement} from 'lit';
 *   import {customElement, property, query} from 'lit/decorators.js';
 *
 *   @customElement('simple-greeting');
 *   class SimpleGreeting extends LitElement {
 *     @property({type: String})
 *     name = 'Somebody';
 *
 *     @query('#myButton');
 *     button;
 *   }
 *
 * Example output:
 *
 *   import {LitElement} from 'lit';
 *
 *   class SimpleGreeting extends LitElement {
 *     static get properties() {
 *       return {
 *         name: {type: String}
 *       };
 *     }
 *
 *     constructor() {
 *       super();
 *       this.name = 'Somebody';
 *     }
 *
 *     get button() {
 *       return this.renderRoot?.querySelector('#myButton');
 *     }
 *   }
 *   customElements.define('simple-greeting', SimpleGreeting);
 */
export default function idiomaticLitDecoratorTransformer(
  program: ts.Program
): ts.TransformerFactory<ts.SourceFile> {
  return (context) => {
    const transformer = new LitTransformer(program, context, [
      new CustomElementVisitor(context),
      new PropertyVisitor(context),
      new StateVisitor(context),
      new QueryVisitor(context),
      new QueryAllVisitor(context),
      new QueryAsyncVisitor(context),
      new QueryAssignedNodesVisitor(context),
      new EventOptionsVisitor(context, program),
    ]);
    return (file) => {
      return ts.visitNode(file, transformer.visitFile);
    };
  };
}
