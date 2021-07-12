/**
 * @license
 * Copyright (c) 2020 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import ts from 'typescript';
import './install-dom-shim.js';
import {_Σ as litHtmlPrivate} from 'lit-html';
import {
  traverse,
  parseFragment,
  isCommentNode,
  isElement,
} from './parse5-utils.js';
// types only
import {DefaultTreeDocumentFragment} from 'parse5';

const {
  _getTemplateHtml,
  _marker,
  _markerMatch,
  _boundAttributeSuffix,
} = litHtmlPrivate;

export const PartType = {
  ATTRIBUTE: 1,
  CHILD: 2,
  PROPERTY: 3,
  BOOLEAN_ATTRIBUTE: 4,
  EVENT: 5,
  ELEMENT: 6,
} as const;
export type PartType = typeof PartType[keyof typeof PartType];

const AttributePartConstructors = {
  [PartType.ATTRIBUTE]: 'AttributePart',
  [PartType.PROPERTY]: 'PropertyPart',
  [PartType.BOOLEAN_ATTRIBUTE]: 'BooleanAttribute',
  [PartType.EVENT]: 'EventPart',
} as const;

interface TemplateInfo {
  topStatement: ts.Statement;
  node: ts.TaggedTemplateExpression;
  variableName: ts.Identifier;
}

export const compileLitTemplates = (): ts.TransformerFactory<ts.SourceFile> => {
  // Transforms a SourceFile to add top-level declarations for each lit-html
  // template in the module
  return (context: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {
    const topLevelStatementToTemplate = new Map<ts.Statement, TemplateInfo>();
    const expressionToTemplate = new Map<
      ts.TaggedTemplateExpression,
      TemplateInfo
    >();

    // Store the stack of open ancestor nodes from sourceFile to the
    // current node so that we can quickly get the top-level statement
    // that contains a template.
    const nodeStack: Array<ts.Node> = [];

    // This visitor
    const findTemplates = <T extends ts.Node>(node: T) => {
      return ts.visitNode(
        node,
        (node: ts.Node): ts.Node => {
          nodeStack.push(node);
          if (isLitTemplate(node)) {
            const topStatement = nodeStack[1] as ts.Statement;
            const templateInfo = {
              topStatement,
              node,
              variableName: ts.factory.createUniqueName('lit_template'),
            };
            topLevelStatementToTemplate.set(topStatement, templateInfo);
            expressionToTemplate.set(node, templateInfo);
            console.log('Lit', nodeStack[1].getText());
            // console.log(nodeStack.map((n) => ts.SyntaxKind[n.kind]));
          }
          const result = ts.visitEachChild(node, findTemplates, context);
          nodeStack.pop();
          return result;
        }
      );
    };

    const rewriteTemplates = (node: ts.Node): ts.VisitResult<ts.Node> => {
      const f = context.factory;

      // Here we insert a top-level pre-compiled definiton of a template
      // that's contained within the current statement.
      if (topLevelStatementToTemplate.has(node as ts.Statement)) {
        const template = topLevelStatementToTemplate.get(node as ts.Statement)!;
        const templateExpression = template.node.template;

        // Generate template strings array
        const stringsArrayExpression = f.createArrayLiteralExpression(
          ts.isNoSubstitutionTemplateLiteral(templateExpression)
            ? [f.createStringLiteral(templateExpression.text)]
            : [
                f.createStringLiteral(templateExpression.head.text),
                ...templateExpression.templateSpans.map((s) =>
                  f.createStringLiteral(s.literal.text)
                ),
              ]
        );

        // TODO: can we move element creation into the runtime to reduce duplication?
        const elementExpression = f.createCallExpression(
          f.createPropertyAccessExpression(
            f.createIdentifier('document'),
            f.createIdentifier('createElement')
          ),
          undefined,
          [f.createStringLiteral('template')]
        );

        // Generate parts array
        const parts: Array<
          | {type: typeof PartType.CHILD; index: number}
          | {
              type: PartType;
              index: number;
              name: string;
              strings: Array<string>;
              tagName: string;
            }
        > = [];
        const [html, attrNames] = _getTemplateHtml(
          ts.isNoSubstitutionTemplateLiteral(templateExpression)
            ? (([templateExpression.text] as unknown) as TemplateStringsArray)
            : (([
                templateExpression.head.text,
                ...templateExpression.templateSpans.map((s) => s.literal.text),
              ] as unknown) as TemplateStringsArray),
          1
        );
        const ast = parseFragment(html, {
          sourceCodeLocationInfo: true,
        }) as DefaultTreeDocumentFragment;

        let nodeIndex = -1;

        /* Current attribute part index, for indexing attrNames */
        let attrIndex = 0;

        traverse(ast, {
          pre(node, _parent) {
            if (isCommentNode(node)) {
              if (node.data === _markerMatch) {
                // make a childPart
                parts.push({
                  type: PartType.CHILD,
                  index: nodeIndex,
                });
              }
            } else if (isElement(node)) {
              if (node.attrs.length > 0) {
                const tagName = node.tagName;
                for (const attr of node.attrs) {
                  if (attr.name.endsWith(_boundAttributeSuffix)) {
                    const strings = attr.value.split(_marker);
                    // We store the case-sensitive name from `attrNames` (generated
                    // while parsing the template strings); note that this assumes
                    // parse5 attribute ordering matches string ordering
                    const [, prefix, caseSensitiveName] = /([.?@])?(.*)/.exec(
                      attrNames[attrIndex++]!
                    )!;
                    parts.push({
                      type:
                        prefix === '.'
                          ? PartType.PROPERTY
                          : prefix === '?'
                          ? PartType.BOOLEAN_ATTRIBUTE
                          : prefix === '@'
                          ? PartType.EVENT
                          : PartType.ATTRIBUTE,
                      index: nodeIndex,
                      name: caseSensitiveName,
                      strings,
                      tagName,
                    });
                  }
                }
              }
            }
            nodeIndex++;
          },
        });

        const partsArrayExpression = f.createArrayLiteralExpression(
          parts.map((part) => {
            const partProperties = [
              f.createPropertyAssignment(
                '_type',
                f.createNumericLiteral(part.type)
              ),
              f.createPropertyAssignment(
                'index',
                f.createNumericLiteral(part.index)
              ),
            ];
            if (
              part.type === PartType.ATTRIBUTE ||
              part.type === PartType.BOOLEAN_ATTRIBUTE ||
              part.type === PartType.PROPERTY ||
              part.type === PartType.EVENT
            ) {
              partProperties.push(
                f.createPropertyAssignment(
                  'name',
                  f.createNumericLiteral(part.name)
                ),
                f.createPropertyAssignment(
                  '_strings',
                  f.createArrayLiteralExpression(
                    part.strings.map((s) => f.createStringLiteral(s))
                  )
                ),
                f.createPropertyAssignment(
                  '_constructor',
                  f.createIdentifier(AttributePartConstructors[part.type])
                )
              );
            }
            return f.createObjectLiteralExpression(partProperties);
          })
        );

        return [
          // Compiled template expression
          f.createVariableStatement(
            // TODO: why isn't this emitting a const?
            [f.createModifier(ts.SyntaxKind.ConstKeyword)],
            [
              f.createVariableDeclaration(
                template.variableName,
                undefined,
                undefined,
                f.createObjectLiteralExpression([
                  f.createPropertyAssignment(
                    '_strings',
                    stringsArrayExpression
                  ),
                  f.createPropertyAssignment('_element', elementExpression),
                  f.createPropertyAssignment('_parts', partsArrayExpression),
                ])
              ),
            ]
          ),
          // <tempalte> innerHTML
          f.createAssignment(
            f.createPropertyAccessExpression(
              template.variableName,
              f.createIdentifier('innerHTML')
            ),
            f.createStringLiteral(html)
          ),
          // Traverse into template-containing top-level statement
          ts.visitEachChild(node, rewriteTemplates, context),
        ];
      }

      // Here we rewrite the template expression to use the pre-compiled template
      if (isLitTemplate(node)) {
        const templateInfo = expressionToTemplate.get(node);
        if (templateInfo === undefined) {
          throw new Error(`template info not found for ${node.getText()}`);
        }
        const templateExpression = node.template;

        return f.createObjectLiteralExpression([
          f.createPropertyAssignment('_$litType$', templateInfo.variableName!),
          f.createPropertyAssignment(
            'values',
            f.createArrayLiteralExpression(
              ts.isNoSubstitutionTemplateLiteral(templateExpression)
                ? []
                : templateExpression.templateSpans.map((s) => s.expression)
            )
          ),
        ]);
      }
      return ts.visitEachChild(node, rewriteTemplates, context);
    };

    return (sourceFile: ts.SourceFile) => {
      findTemplates(sourceFile);
      // console.log(templates.map((t) => t.node.getText()));
      // now add statements
      // const f = context.factory;

      // let templateIndex = 0;
      // for (const s of sourceFile.statements) {
      //   const template = templates[templateIndex];
      //   if (s === template.topStatement) {
      //     console.log('A', s.getText());
      //   }
      // }
      // for (const t of templates) {
      //   const varStmt = f.createVariableStatement(
      //     [ts.createToken(ts.SyntaxKind.ConstKeyword)],
      //     [f.createVariableDeclaration(
      //       f.createUniqueName('hello'),
      //       undefined,
      //       undefined,
      //       ts.createLiteral('value'))]
      //   );
      // }
      return ts.visitNode(sourceFile, rewriteTemplates);
    };
  };
};

/**
 * E.g. html`foo` or html`foo${bar}`
 */
const isLitTemplate = (node: ts.Node): node is ts.TaggedTemplateExpression =>
  ts.isTaggedTemplateExpression(node) &&
  ts.isIdentifier(node.tag) &&
  node.tag.escapedText === 'html';
