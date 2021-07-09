/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

// IMPORTANT: these imports must be type-only
import type {Directive, DirectiveResult, PartInfo} from './directive.js';

const DEV_MODE = true;
const ENABLE_EXTRA_SECURITY_HOOKS = true;
const ENABLE_SHADYDOM_NOPATCH = true;

/**
 * `true` if we're building for google3 with temporary back-compat helpers.
 * This export is not present in prod builds.
 * @internal
 */
export const INTERNAL = true;

if (DEV_MODE) {
  console.warn('lit-html is in dev mode. Not recommended for production!');
}

const extraGlobals = window as LitExtraGlobals;

const wrap =
  ENABLE_SHADYDOM_NOPATCH &&
  extraGlobals.ShadyDOM?.inUse &&
  extraGlobals.ShadyDOM?.noPatch === true
    ? extraGlobals.ShadyDOM!.wrap
    : (node: Node) => node;

const trustedTypes = (globalThis as unknown as Partial<Window>).trustedTypes;

/**
 * Our TrustedTypePolicy for HTML which is declared using the html template
 * tag function.
 *
 * That HTML is a developer-authored constant, and is parsed with innerHTML
 * before any untrusted expressions have been mixed in. Therefor it is
 * considered safe by construction.
 */
const policy = trustedTypes
  ? trustedTypes.createPolicy('lit-html', {
      createHTML: (s) => s,
    })
  : undefined;

/**
 * Used to sanitize any value before it is written into the DOM. This can be
 * used to implement a security policy of allowed and disallowed values in
 * order to prevent XSS attacks.
 *
 * One way of using this callback would be to check attributes and properties
 * against a list of high risk fields, and require that values written to such
 * fields be instances of a class which is safe by construction. Closure's Safe
 * HTML Types is one implementation of this technique (
 * https://github.com/google/safe-html-types/blob/master/doc/safehtml-types.md).
 * The TrustedTypes polyfill in API-only mode could also be used as a basis
 * for this technique (https://github.com/WICG/trusted-types).
 *
 * @param node The HTML node (usually either a #text node or an Element) that
 *     is being written to. Note that this is just an exemplar node, the write
 *     may take place against another instance of the same class of node.
 * @param name The name of an attribute or property (for example, 'href').
 * @param type Indicates whether the write that's about to be performed will
 *     be to a property or a node.
 * @return A function that will sanitize this class of writes.
 */
export type SanitizerFactory = (
  node: Node,
  name: string,
  type: 'property' | 'attribute'
) => ValueSanitizer;

/**
 * A function which can sanitize values that will be written to a specific kind
 * of DOM sink.
 *
 * See SanitizerFactory.
 *
 * @param value The value to sanitize. Will be the actual value passed into
 *     the lit-html template literal, so this could be of any type.
 * @return The value to write to the DOM. Usually the same as the input value,
 *     unless sanitization is needed.
 */
export type ValueSanitizer = (value: unknown) => unknown;

const identityFunction: ValueSanitizer = (value: unknown) => value;
const noopSanitizer: SanitizerFactory = (
  _node: Node,
  _name: string,
  _type: 'property' | 'attribute'
) => identityFunction;

/** Sets the global sanitizer factory. */
const setSanitizer = (newSanitizer: SanitizerFactory) => {
  if (!ENABLE_EXTRA_SECURITY_HOOKS) {
    return;
  }
  if (sanitizerFactoryInternal !== noopSanitizer) {
    throw new Error(
      `Attempted to overwrite existing lit-html security policy.` +
        ` setSanitizeDOMValueFactory should be called at most once.`
    );
  }
  sanitizerFactoryInternal = newSanitizer;
};

/**
 * Only used in internal tests, not a part of the public API.
 */
const _testOnlyClearSanitizerFactoryDoNotCallOrElse = () => {
  sanitizerFactoryInternal = noopSanitizer;
};

const createSanitizer: SanitizerFactory = (node, name, type) => {
  return sanitizerFactoryInternal(node, name, type);
};

// Added to an attribute name to mark the attribute as bound so we can find
// it easily.
const boundAttributeSuffix = '$lit$';

// This marker is used in many syntactic positions in HTML, so it must be
// a valid element name and attribute name. We don't support dynamic names (yet)
// but this at least ensures that the parse tree is closer to the template
// intention.
const marker = `lit$${String(Math.random()).slice(9)}$`;

// String used to tell if a comment is a marker comment
const markerMatch = '?' + marker;

// Text used to insert a comment marker node. We use processing instruction
// syntax because it's slightly smaller, but parses as a comment node.
const nodeMarker = `<${markerMatch}>`;

const d = document;

// Creates a dynamic marker. We never have to search for these in the DOM.
const createMarker = (v = '') => d.createComment(v);

// https://tc39.github.io/ecma262/#sec-typeof-operator
type Primitive = null | undefined | boolean | number | string | symbol | bigint;
const isPrimitive = (value: unknown): value is Primitive =>
  value === null || (typeof value != 'object' && typeof value != 'function');
const isArray = Array.isArray;
const isIterable = (value: unknown): value is Iterable<unknown> =>
  isArray(value) ||
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  typeof (value as any)?.[Symbol.iterator] === 'function';

const SPACE_CHAR = `[ \t\n\f\r]`;
const ATTR_VALUE_CHAR = `[^ \t\n\f\r"'\`<>=]`;
const NAME_CHAR = `[^\\s"'>=/]`;

// These regexes represent the five parsing states that we care about in the
// Template's HTML scanner. They match the *end* of the state they're named
// after.
// Depending on the match, we transition to a new state. If there's no match,
// we stay in the same state.
// Note that the regexes are stateful. We utilize lastIndex and sync it
// across the multiple regexes used. In addition to the five regexes below
// we also dynamically create a regex to find the matching end tags for raw
// text elements.

/**
 * End of text is: `<` followed by:
 *   (comment start) or (tag) or (dynamic tag binding)
 */
const textEndRegex = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
const COMMENT_START = 1;
const TAG_NAME = 2;
const DYNAMIC_TAG_NAME = 3;

const commentEndRegex = /-->/g;
/**
 * Comments not started with <!--, like </{, can be ended by a single `>`
 */
const comment2EndRegex = />/g;

/**
 * The tagEnd regex matches the end of the "inside an opening" tag syntax
 * position. It either matches a `>`, an attribute-like sequence, or the end
 * of the string after a space (attribute-name position ending).
 *
 * See attributes in the HTML spec:
 * https://www.w3.org/TR/html5/syntax.html#elements-attributes
 *
 * " \t\n\f\r" are HTML space characters:
 * https://infra.spec.whatwg.org/#ascii-whitespace
 *
 * So an attribute is:
 *  * The name: any character except a whitespace character, ("), ('), ">",
 *    "=", or "/". Note: this is different from the HTML spec which also excludes control characters.
 *  * Followed by zero or more space characters
 *  * Followed by "="
 *  * Followed by zero or more space characters
 *  * Followed by:
 *    * Any character except space, ('), ("), "<", ">", "=", (`), or
 *    * (") then any non-("), or
 *    * (') then any non-(')
 */
const tagEndRegex = new RegExp(
  `>|${SPACE_CHAR}(?:(${NAME_CHAR}+)(${SPACE_CHAR}*=${SPACE_CHAR}*(?:${ATTR_VALUE_CHAR}|("|')|))|$)`,
  'g'
);
const ENTIRE_MATCH = 0;
const ATTRIBUTE_NAME = 1;
const SPACES_AND_EQUALS = 2;
const QUOTE_CHAR = 3;

const singleQuoteAttrEndRegex = /'/g;
const doubleQuoteAttrEndRegex = /"/g;
/**
 * Matches the raw text elements.
 *
 * Comments are not parsed within raw text elements, so we need to search their
 * text content for marker strings.
 */
const rawTextElement = /^(?:script|style|textarea)$/i;

/** TemplateResult types */
const HTML_RESULT = 1;
const SVG_RESULT = 2;

type ResultType = typeof HTML_RESULT | typeof SVG_RESULT;

// TemplatePart types
// IMPORTANT: these must match the values in PartType
const ATTRIBUTE_PART = 1;
const CHILD_PART = 2;
const PROPERTY_PART = 3;
const BOOLEAN_ATTRIBUTE_PART = 4;
const EVENT_PART = 5;
const ELEMENT_PART = 6;
const COMMENT_PART = 7;

/**
 * The return type of the template tag functions.
 */
export type TemplateResult<T extends ResultType = ResultType> = {
  // This property needs to remain unminified.
  ['_$litType$']: T;
  // TODO (justinfagnani): consider shorter names, like `s` and `v`. This is a
  // semi-public API though. We can't just let Terser rename them for us,
  // because we need TemplateResults to work between compatible versions of
  // lit-html.
  strings: TemplateStringsArray;
  values: unknown[];
};

export type HTMLTemplateResult = TemplateResult<typeof HTML_RESULT>;

export type SVGTemplateResult = TemplateResult<typeof SVG_RESULT>;

export interface CompiledTemplateResult {
  // This is a factory in order to make template initialization lazy
  // and allow ShadyRenderOptions scope to be passed in.
  // This property needs to remain unminified.
  ['_$litType$']: CompiledTemplate;
  values: unknown[];
}

export interface CompiledTemplate extends Omit<Template, 'el'> {
  // el is overridden to be optional. We initialize it on first render
  el?: HTMLTemplateElement;

  // The prepared HTML string to create a template element from.
  h: TrustedHTML;
}

/**
 * Generates a template literal tag function that returns a TemplateResult with
 * the given result type.
 */
const tag =
  <T extends ResultType>(type: T) =>
  (strings: TemplateStringsArray, ...values: unknown[]): TemplateResult<T> => ({
    // This property needs to remain unminified.
    ['_$litType$']: type,
    strings,
    values,
  });

/**
 * Interprets a template literal as an HTML template that can efficiently
 * render to and update a container.
 */
export const html = tag(HTML_RESULT);

/**
 * Interprets a template literal as an SVG template that can efficiently
 * render to and update a container.
 */
export const svg = tag(SVG_RESULT);

/**
 * A sentinel value that signals that a value was handled by a directive and
 * should not be written to the DOM.
 */
export const noChange = Symbol.for('lit-noChange');

/**
 * A sentinel value that signals a ChildPart to fully clear its content.
 */
export const nothing = Symbol.for('lit-nothing');

/**
 * The cache of prepared templates, keyed by the tagged TemplateStringsArray
 * and _not_ accounting for the specific template tag used. This means that
 * template tags cannot be dynamic - the must statically be one of html, svg,
 * or attr. This restriction simplifies the cache lookup, which is on the hot
 * path for rendering.
 */
const templateCache = new WeakMap<TemplateStringsArray, Template>();

export interface RenderOptions {
  /**
   * An object to use as the `this` value for event listeners. It's often
   * useful to set this to the host component rendering a template.
   */
  host?: object;
  /**
   * A DOM node before which to render content in the container.
   */
  renderBefore?: ChildNode | null;
  /**
   * Node used for cloning the template (`importNode` will be called on this
   * node). This controls the `ownerDocument` of the rendered DOM, along with
   * any inherited context. Defaults to the global `document`.
   */
  creationScope?: {importNode(node: Node, deep?: boolean): Node};
}

/**
 * Internally we can export this interface and change the type of
 * render()'s options.
 */
interface InternalRenderOptions extends RenderOptions {
  /**
   * An internal-only migration flag
   * @internal
   */
  clearContainerForLit2MigrationOnly?: boolean;
}

/**
 * Renders a value, usually a lit-html TemplateResult, to the container.
 * @param value
 * @param container
 * @param options
 */
export const render = (
  value: unknown,
  container: HTMLElement | DocumentFragment,
  options?: RenderOptions
): ChildPart => {
  const partOwnerNode = options?.renderBefore ?? container;
  // This property needs to remain unminified.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let part: ChildPart = (partOwnerNode as any)['_$litPart$'];
  if (part === undefined) {
    // Internal modification: don't clear container to match lit-html 2.0
    if (
      INTERNAL &&
      (options as InternalRenderOptions)?.clearContainerForLit2MigrationOnly ===
        true
    ) {
      container.childNodes.forEach((c) => c.remove());
    }
    const endNode = options?.renderBefore ?? null;
    // This property needs to remain unminified.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (partOwnerNode as any)['_$litPart$'] = part = new ChildPart(
      container.insertBefore(createMarker(), endNode),
      endNode,
      undefined,
      options
    );
  }
  part._$setValue(value);
  return part;
};

if (ENABLE_EXTRA_SECURITY_HOOKS) {
  render.setSanitizer = setSanitizer;
  render.createSanitizer = createSanitizer;
  if (DEV_MODE) {
    render._testOnlyClearSanitizerFactoryDoNotCallOrElse =
      _testOnlyClearSanitizerFactoryDoNotCallOrElse;
  }
}

const walker = d.createTreeWalker(
  d,
  129 /* NodeFilter.SHOW_{ELEMENT|COMMENT} */,
  null,
  false
);

let sanitizerFactoryInternal: SanitizerFactory = noopSanitizer;

//
// Classes only below here, const variable declarations only above here...
//
// Keeping variable declarations and classes together improves minification.
// Interfaces and type aliases can be interleaved freely.
//

// Type for classes that have a `_directive` or `_directives[]` field, used by
// `resolveDirective`
export interface DirectiveParent {
  _$parent?: DirectiveParent;
  __directive?: Directive;
  __directives?: Array<Directive | undefined>;
}

/**
 * Returns an HTML string for the given TemplateStringsArray and result type
 * (HTML or SVG), along with the case-sensitive bound attribute names in
 * template order. The HTML contains comment comment markers denoting the
 * `ChildPart`s and suffixes on bound attributes denoting the `AttributeParts`.
 *
 * @param strings template strings array
 * @param type HTML or SVG
 * @return Array containing `[html, attrNames]` (array returned for terseness,
 *     to avoid object fields since this code is shared with non-minified SSR
 *     code)
 */
const getTemplateHtml = (
  strings: TemplateStringsArray,
  type: ResultType
): [TrustedHTML, Array<string | undefined>] => {
  // Insert makers into the template HTML to represent the position of
  // bindings. The following code scans the template strings to determine the
  // syntactic position of the bindings. They can be in text position, where
  // we insert an HTML comment, attribute value position, where we insert a
  // sentinel string and re-write the attribute name, or inside a tag where
  // we insert the sentinel string.
  const l = strings.length - 1;
  // Stores the case-sensitive bound attribute names in the order of their
  // parts. ElementParts are also reflected in this array as undefined
  // rather than a string, to disambiguate from attribute bindings.
  const attrNames: Array<string | undefined> = [];
  let html = type === SVG_RESULT ? '<svg>' : '';

  // When we're inside a raw text tag (not it's text content), the regex
  // will still be tagRegex so we can find attributes, but will switch to
  // this regex when the tag ends.
  let rawTextEndRegex: RegExp | undefined;

  // The current parsing state, represented as a reference to one of the
  // regexes
  let regex = textEndRegex;

  for (let i = 0; i < l; i++) {
    const s = strings[i];
    // The index of the end of the last attribute name. When this is
    // positive at end of a string, it means we're in an attribute value
    // position and need to rewrite the attribute name.
    // We also use a special value of -2 to indicate that we encountered
    // the end of a string in attribute name position.
    let attrNameEndIndex = -1;
    let attrName: string | undefined;
    let lastIndex = 0;
    let match!: RegExpExecArray | null;

    // The conditions in this loop handle the current parse state, and the
    // assignments to the `regex` variable are the state transitions.
    while (lastIndex < s.length) {
      // Make sure we start searching from where we previously left off
      regex.lastIndex = lastIndex;
      match = regex.exec(s);
      if (match === null) {
        break;
      }
      lastIndex = regex.lastIndex;
      if (regex === textEndRegex) {
        if (match[COMMENT_START] === '!--') {
          regex = commentEndRegex;
        } else if (match[COMMENT_START] !== undefined) {
          // We started a weird comment, like </{
          regex = comment2EndRegex;
        } else if (match[TAG_NAME] !== undefined) {
          if (rawTextElement.test(match[TAG_NAME])) {
            // Record if we encounter a raw-text element. We'll switch to
            // this regex at the end of the tag.
            rawTextEndRegex = new RegExp(`</${match[TAG_NAME]}`, 'g');
          }
          regex = tagEndRegex;
        } else if (match[DYNAMIC_TAG_NAME] !== undefined) {
          // dynamic tag name
          regex = tagEndRegex;
        }
      } else if (regex === tagEndRegex) {
        if (match[ENTIRE_MATCH] === '>') {
          // End of a tag. If we had started a raw-text element, use that
          // regex
          regex = rawTextEndRegex ?? textEndRegex;
          // We may be ending an unquoted attribute value, so make sure we
          // clear any pending attrNameEndIndex
          attrNameEndIndex = -1;
        } else if (match[ATTRIBUTE_NAME] === undefined) {
          // Attribute name position
          attrNameEndIndex = -2;
        } else {
          attrNameEndIndex = regex.lastIndex - match[SPACES_AND_EQUALS].length;
          attrName = match[ATTRIBUTE_NAME];
          regex =
            match[QUOTE_CHAR] === undefined
              ? tagEndRegex
              : match[QUOTE_CHAR] === '"'
              ? doubleQuoteAttrEndRegex
              : singleQuoteAttrEndRegex;
        }
      } else if (
        regex === doubleQuoteAttrEndRegex ||
        regex === singleQuoteAttrEndRegex
      ) {
        regex = tagEndRegex;
      } else if (regex === commentEndRegex || regex === comment2EndRegex) {
        regex = textEndRegex;
      } else {
        // Not one of the five state regexes, so it must be the dynamically
        // created raw text regex and we're at the close of that element.
        regex = tagEndRegex;
        rawTextEndRegex = undefined;
      }
    }

    if (DEV_MODE) {
      // If we have a attrNameEndIndex, which indicates that we should
      // rewrite the attribute name, assert that we're in a valid attribute
      // position - either in a tag, or a quoted attribute value.
      console.assert(
        attrNameEndIndex === -1 ||
          regex === tagEndRegex ||
          regex === singleQuoteAttrEndRegex ||
          regex === doubleQuoteAttrEndRegex,
        'unexpected parse state B'
      );
    }

    // We have four cases:
    //  1. We're in text position, and not in a raw text element
    //     (regex === textEndRegex): insert a comment marker.
    //  2. We have a non-negative attrNameEndIndex which means we need to
    //     rewrite the attribute name to add a bound attribute suffix.
    //  3. We're at the non-first binding in a multi-binding attribute, use a
    //     plain marker.
    //  4. We're somewhere else inside the tag. If we're in attribute name
    //     position (attrNameEndIndex === -2), add a sequential suffix to
    //     generate a unique attribute name.

    // Detect a binding next to self-closing tag end and insert a space to
    // separate the marker from the tag end:
    const end =
      regex === tagEndRegex && strings[i + 1].startsWith('/>') ? ' ' : '';
    html +=
      regex === textEndRegex
        ? s + nodeMarker
        : attrNameEndIndex >= 0
        ? (attrNames.push(attrName!),
          s.slice(0, attrNameEndIndex) +
            boundAttributeSuffix +
            s.slice(attrNameEndIndex)) +
          marker +
          end
        : s +
          marker +
          (attrNameEndIndex === -2 ? (attrNames.push(undefined), i) : end);
  }

  const htmlResult: string | TrustedHTML =
    html + (strings[l] || '<?>') + (type === SVG_RESULT ? '</svg>' : '');

  // Returned as an array for terseness
  return [
    policy !== undefined
      ? policy.createHTML(htmlResult)
      : (htmlResult as unknown as TrustedHTML),
    attrNames,
  ];
};

/** @internal */
export type {Template};
class Template {
  /** @internal */
  el!: HTMLTemplateElement;
  /** @internal */
  parts: Array<TemplatePart> = [];

  constructor(
    // This property needs to remain unminified.
    {strings, ['_$litType$']: type}: TemplateResult,
    options?: RenderOptions
  ) {
    let node: Node | null;
    let nodeIndex = 0;
    let attrNameIndex = 0;
    const partCount = strings.length - 1;
    const parts = this.parts;

    // Create template element
    const [html, attrNames] = getTemplateHtml(strings, type);
    this.el = Template.createElement(html, options);
    walker.currentNode = this.el.content;

    // Reparent SVG nodes into template root
    if (type === SVG_RESULT) {
      const content = this.el.content;
      const svgElement = content.firstChild!;
      svgElement.remove();
      content.append(...svgElement.childNodes);
    }

    // Walk the template to find binding markers and create TemplateParts
    while ((node = walker.nextNode()) !== null && parts.length < partCount) {
      if (node.nodeType === 1) {
        // TODO (justinfagnani): for attempted dynamic tag names, we don't
        // increment the bindingIndex, and it'll be off by 1 in the element
        // and off by two after it.
        if ((node as Element).hasAttributes()) {
          // We defer removing bound attributes because on IE we might not be
          // iterating attributes in their template order, and would sometimes
          // remove an attribute that we still need to create a part for.
          const attrsToRemove = [];
          for (const name of (node as Element).getAttributeNames()) {
            // `name` is the name of the attribute we're iterating over, but not
            // _neccessarily_ the name of the attribute we will create a part
            // for. They can be different in browsers that don't iterate on
            // attributes in source order. In that case the attrNames array
            // contains the attribute name we'll process next. We only need the
            // attribute name here to know if we should process a bound attribute
            // on this element.
            if (
              name.endsWith(boundAttributeSuffix) ||
              name.startsWith(marker)
            ) {
              const realName = attrNames[attrNameIndex++];
              attrsToRemove.push(name);
              if (realName !== undefined) {
                // Lowercase for case-sensitive SVG attributes like viewBox
                const value = (node as Element).getAttribute(
                  realName.toLowerCase() + boundAttributeSuffix
                )!;
                const statics = value.split(marker);
                const m = /([.?@])?(.*)/.exec(realName)!;
                parts.push({
                  type: ATTRIBUTE_PART,
                  index: nodeIndex,
                  name: m[2],
                  strings: statics,
                  ctor:
                    m[1] === '.'
                      ? PropertyPart
                      : m[1] === '?'
                      ? BooleanAttributePart
                      : m[1] === '@'
                      ? EventPart
                      : AttributePart,
                });
              } else {
                parts.push({
                  type: ELEMENT_PART,
                  index: nodeIndex,
                });
              }
            }
          }
          for (const name of attrsToRemove) {
            (node as Element).removeAttribute(name);
          }
        }
        // TODO (justinfagnani): benchmark the regex against testing for each
        // of the 3 raw text element names.
        if (rawTextElement.test((node as Element).tagName)) {
          // For raw text elements we need to split the text content on
          // markers, create a Text node for each segment, and create
          // a TemplatePart for each marker.
          const strings = (node as Element).textContent!.split(marker);
          const lastIndex = strings.length - 1;
          if (lastIndex > 0) {
            (node as Element).textContent = trustedTypes
              ? (trustedTypes.emptyScript as unknown as '')
              : '';
            // Generate a new text node for each literal section
            // These nodes are also used as the markers for node parts
            // We can't use empty text nodes as markers because they're
            // normalized in some browsers (TODO: check)
            for (let i = 0; i < lastIndex; i++) {
              (node as Element).append(strings[i], createMarker());
              // Walk past the marker node we just added
              walker.nextNode();
              parts.push({type: CHILD_PART, index: ++nodeIndex});
            }
            // Note because this marker is added after the walker's current
            // node, it will be walked to in the outer loop (and ignored), so
            // we don't need to adjust nodeIndex here
            (node as Element).append(strings[lastIndex], createMarker());
          }
        }
      } else if (node.nodeType === 8) {
        const data = (node as Comment).data;
        if (data === markerMatch) {
          parts.push({type: CHILD_PART, index: nodeIndex});
        } else {
          let i = -1;
          while ((i = (node as Comment).data.indexOf(marker, i + 1)) !== -1) {
            // Comment node has a binding marker inside, make an inactive part
            // The binding won't work, but subsequent bindings will
            // TODO (justinfagnani): consider whether it's even worth it to
            // make bindings in comments work
            parts.push({type: COMMENT_PART, index: nodeIndex});
            // Move to the end of the match
            i += marker.length - 1;
          }
        }
      }
      nodeIndex++;
    }
  }

  // Overridden via `litHtmlPlatformSupport` to provide platform support.
  /** @nocollapse */
  static createElement(html: TrustedHTML, _options?: RenderOptions) {
    const el = d.createElement('template');
    el.innerHTML = html as unknown as string;
    return el;
  }
}

export interface Disconnectable {
  _$parent?: Disconnectable;
  _$disconnectableChildren?: Set<Disconnectable>;
}

function resolveDirective(
  part: ChildPart | AttributePart | ElementPart,
  value: unknown,
  parent: DirectiveParent = part,
  attributeIndex?: number
): unknown {
  // Bail early if the value is explicitly noChange. Note, this means any
  // nested directive is still attached and is not run.
  if (value === noChange) {
    return value;
  }
  let currentDirective =
    attributeIndex !== undefined
      ? (parent as AttributePart).__directives?.[attributeIndex]
      : (parent as ChildPart | ElementPart | Directive).__directive;
  const nextDirectiveConstructor = isPrimitive(value)
    ? undefined
    : // This property needs to remain unminified.
      (value as DirectiveResult)['_$litDirective$'];
  if (currentDirective?.constructor !== nextDirectiveConstructor) {
    // This property needs to remain unminified.
    currentDirective?.['_$setDirectiveConnected']?.(false);
    if (nextDirectiveConstructor === undefined) {
      currentDirective = undefined;
    } else {
      currentDirective = new nextDirectiveConstructor(part as PartInfo);
      currentDirective._$initialize(part, parent, attributeIndex);
    }
    if (attributeIndex !== undefined) {
      ((parent as AttributePart).__directives ??= [])[attributeIndex] =
        currentDirective;
    } else {
      (parent as ChildPart | Directive).__directive = currentDirective;
    }
  }
  if (currentDirective !== undefined) {
    value = resolveDirective(
      part,
      currentDirective._$resolve(part, (value as DirectiveResult).values),
      currentDirective,
      attributeIndex
    );
  }
  return value;
}

/**
 * An updateable instance of a Template. Holds references to the Parts used to
 * update the template instance.
 */
class TemplateInstance {
  /** @internal */
  _$template: Template;
  /** @internal */
  _parts: Array<Part | undefined> = [];

  /** @internal */
  _$parent: Disconnectable;
  /** @internal */
  _$disconnectableChildren?: Set<Disconnectable> = undefined;

  constructor(template: Template, parent: ChildPart) {
    this._$template = template;
    this._$parent = parent;
  }

  // This method is separate from the constructor because we need to return a
  // DocumentFragment and we don't want to hold onto it with an instance field.
  _clone(options: RenderOptions | undefined) {
    const {
      el: {content},
      parts: parts,
    } = this._$template;
    const fragment = (options?.creationScope ?? d).importNode(content, true);
    walker.currentNode = fragment;

    let node = walker.nextNode()!;
    let nodeIndex = 0;
    let partIndex = 0;
    let templatePart = parts[0];

    while (templatePart !== undefined) {
      if (nodeIndex === templatePart.index) {
        let part: Part | undefined;
        if (templatePart.type === CHILD_PART) {
          part = new ChildPart(
            node as HTMLElement,
            node.nextSibling,
            this,
            options
          );
        } else if (templatePart.type === ATTRIBUTE_PART) {
          part = new templatePart.ctor(
            node as HTMLElement,
            templatePart.name,
            templatePart.strings,
            this,
            options
          );
        } else if (templatePart.type === ELEMENT_PART) {
          part = new ElementPart(node as HTMLElement, this, options);
        }
        this._parts.push(part);
        templatePart = parts[++partIndex];
      }
      if (nodeIndex !== templatePart?.index) {
        node = walker.nextNode()!;
        nodeIndex++;
      }
    }
    return fragment;
  }

  _update(values: Array<unknown>) {
    let i = 0;
    for (const part of this._parts) {
      if (part !== undefined) {
        if ((part as AttributePart).strings !== undefined) {
          (part as AttributePart)._$setValue(values, part as AttributePart, i);
          // The number of values the part consumes is part.strings.length - 1
          // since values are in between template spans. We increment i by 1
          // later in the loop, so increment it by part.strings.length - 2 here
          i += (part as AttributePart).strings!.length - 2;
        } else {
          part._$setValue(values[i]);
        }
      }
      i++;
    }
  }
}

/*
 * Parts
 */
type AttributeTemplatePart = {
  readonly type: typeof ATTRIBUTE_PART;
  readonly index: number;
  readonly name: string;
  /** @internal */
  readonly ctor: typeof AttributePart;
  /** @internal */
  readonly strings: ReadonlyArray<string>;
};
type NodeTemplatePart = {
  readonly type: typeof CHILD_PART;
  readonly index: number;
};
type ElementTemplatePart = {
  readonly type: typeof ELEMENT_PART;
  readonly index: number;
};
type CommentTemplatePart = {
  readonly type: typeof COMMENT_PART;
  readonly index: number;
};

/**
 * A TemplatePart represents a dynamic part in a template, before the template
 * is instantiated. When a template is instantiated Parts are created from
 * TemplateParts.
 */
type TemplatePart =
  | NodeTemplatePart
  | AttributeTemplatePart
  | ElementTemplatePart
  | CommentTemplatePart;

export type Part =
  | ChildPart
  | AttributePart
  | PropertyPart
  | BooleanAttributePart
  | ElementPart
  | EventPart;

export type {ChildPart};
class ChildPart {
  readonly type = CHILD_PART;
  readonly options: RenderOptions | undefined;
  _$committedValue: unknown;
  /** @internal */
  __directive?: Directive;
  /** @internal */
  _$startNode: ChildNode;
  /** @internal */
  _$endNode: ChildNode | null;
  private _textSanitizer: ValueSanitizer | undefined;
  /** @internal */
  _$parent: Disconnectable | undefined;

  // The following fields will be patched onto ChildParts when required by
  // AsyncDirective
  /** @internal */
  _$disconnectableChildren?: Set<Disconnectable> = undefined;
  /** @internal */
  _$setChildPartConnected?(
    isConnected: boolean,
    removeFromParent?: boolean,
    from?: number
  ): void;
  /** @internal */
  _$reparentDisconnectables?(parent: Disconnectable): void;

  constructor(
    startNode: ChildNode,
    endNode: ChildNode | null,
    parent: TemplateInstance | ChildPart | undefined,
    options: RenderOptions | undefined
  ) {
    this._$startNode = startNode;
    this._$endNode = endNode;
    this._$parent = parent;
    this.options = options;
    if (ENABLE_EXTRA_SECURITY_HOOKS) {
      // Explicitly initialize for consistent class shape.
      this._textSanitizer = undefined;
    }
  }

  /**
   * Sets the connection state for any `AsyncDirectives` contained
   * within this part and runs their `disconnected` or `reconnected`, according
   * to the `isConnected` argument.
   */
  setConnected(isConnected: boolean) {
    this._$setChildPartConnected?.(isConnected);
  }

  /**
   * The parent node into which the part renders its content.
   *
   * A ChildPart's content consists of a range of adjacent child nodes of
   * `.parentNode`, possibly bordered by 'marker nodes' (`.startNode` and
   * `.endNode`).
   *
   * - If both `.startNode` and `.endNode` are non-null, then the part's content
   * consists of all siblings between `.startNode` and `.endNode`, exclusively.
   *
   * - If `.startNode` is non-null but `.endNode` is null, then the part's
   * content consists of all siblings following `.startNode`, up to and
   * including the last child of `.parentNode`. If `.endNode` is non-null, then
   * `.startNode` will always be non-null.
   *
   * - If both `.endNode` and `.startNode` are null, then the part's content
   * consists of all child nodes of `.parentNode`.
   */
  get parentNode(): Node {
    return wrap(this._$startNode).parentNode!;
  }

  /**
   * The part's leading marker node, if any. See `.parentNode` for more
   * information.
   */
  get startNode(): Node | null {
    return this._$startNode;
  }

  /**
   * The part's trailing marker node, if any. See `.parentNode` for more
   * information.
   */
  get endNode(): Node | null {
    return this._$endNode;
  }

  _$setValue(value: unknown, directiveParent: DirectiveParent = this): void {
    value = resolveDirective(this, value, directiveParent);
    if (isPrimitive(value)) {
      // Non-rendering child values. It's important that these do not render
      // empty text nodes to avoid issues with preventing default <slot>
      // fallback content.
      if (value === nothing || value == null || value === '') {
        if (this._$committedValue !== nothing) {
          this._$clear();
        }
        this._$committedValue = nothing;
      } else if (value !== this._$committedValue && value !== noChange) {
        this._commitText(value);
      }
      // This property needs to remain unminified.
    } else if ((value as TemplateResult)['_$litType$'] !== undefined) {
      this._commitTemplateResult(value as TemplateResult);
    } else if ((value as Node).nodeType !== undefined) {
      this._commitNode(value as Node);
    } else if (isIterable(value)) {
      this._commitIterable(value);
    } else {
      // Fallback, will render the string representation
      this._commitText(value);
    }
  }

  private _insert<T extends Node>(node: T, ref = this._$endNode) {
    return wrap(wrap(this._$startNode).parentNode!).insertBefore(node, ref);
  }

  private _commitNode(value: Node): void {
    if (this._$committedValue !== value) {
      this._$clear();
      if (
        ENABLE_EXTRA_SECURITY_HOOKS &&
        sanitizerFactoryInternal !== noopSanitizer
      ) {
        const parentNodeName = this._$startNode.parentNode?.nodeName;
        if (parentNodeName === 'STYLE' || parentNodeName === 'SCRIPT') {
          this._insert(
            new Text(
              '/* lit-html will not write ' +
                'TemplateResults to scripts and styles */'
            )
          );
          return;
        }
      }
      this._$committedValue = this._insert(value);
    }
  }

  private _commitText(value: unknown): void {
    const node = wrap(this._$startNode).nextSibling;
    // TODO(justinfagnani): Can we just check if this._$committedValue is primitive?
    if (
      node !== null &&
      node.nodeType === 3 /* Node.TEXT_NODE */ &&
      (this._$endNode === null
        ? wrap(node).nextSibling === null
        : node === wrap(this._$endNode).previousSibling)
    ) {
      if (ENABLE_EXTRA_SECURITY_HOOKS) {
        if (this._textSanitizer === undefined) {
          this._textSanitizer = createSanitizer(node, 'data', 'property');
        }
        value = this._textSanitizer(value);
      }
      // If we only have a single text node between the markers, we can just
      // set its value, rather than replacing it.
      (node as Text).data = value as string;
    } else {
      if (ENABLE_EXTRA_SECURITY_HOOKS) {
        const textNode = document.createTextNode('');
        this._commitNode(textNode);
        // When setting text content, for security purposes it matters a lot
        // what the parent is. For example, <style> and <script> need to be
        // handled with care, while <span> does not. So first we need to put a
        // text node into the document, then we can sanitize its contentx.
        if (this._textSanitizer === undefined) {
          this._textSanitizer = createSanitizer(textNode, 'data', 'property');
        }
        value = this._textSanitizer(value);
        textNode.data = value as string;
      } else {
        this._commitNode(d.createTextNode(value as string));
      }
    }
    this._$committedValue = value;
  }

  private _commitTemplateResult(
    result: TemplateResult | CompiledTemplateResult
  ): void {
    // This property needs to remain unminified.
    const {values, ['_$litType$']: type} = result;
    // If $litType$ is a number, result is a plain TemplateResult and we get
    // the template from the template cache. If not, result is a
    // CompiledTemplateResult and _$litType$ is a CompiledTemplate and we need
    // to create the <template> element the first time we see it.
    const template: Template | CompiledTemplate =
      typeof type === 'number'
        ? this._$getTemplate(result as TemplateResult)
        : (type.el === undefined &&
            (type.el = Template.createElement(type.h, this.options)),
          type);

    if ((this._$committedValue as TemplateInstance)?._$template === template) {
      (this._$committedValue as TemplateInstance)._update(values);
    } else {
      const instance = new TemplateInstance(template as Template, this);
      const fragment = instance._clone(this.options);
      instance._update(values);
      this._commitNode(fragment);
      this._$committedValue = instance;
    }
  }

  // Overridden via `litHtmlPlatformSupport` to provide platform support.
  /** @internal */
  _$getTemplate(result: TemplateResult) {
    let template = templateCache.get(result.strings);
    if (template === undefined) {
      templateCache.set(result.strings, (template = new Template(result)));
    }
    return template;
  }

  private _commitIterable(value: Iterable<unknown>): void {
    // For an Iterable, we create a new InstancePart per item, then set its
    // value to the item. This is a little bit of overhead for every item in
    // an Iterable, but it lets us recurse easily and efficiently update Arrays
    // of TemplateResults that will be commonly returned from expressions like:
    // array.map((i) => html`${i}`), by reusing existing TemplateInstances.

    // If value is an array, then the previous render was of an
    // iterable and value will contain the ChildParts from the previous
    // render. If value is not an array, clear this part and make a new
    // array for ChildParts.
    if (!isArray(this._$committedValue)) {
      this._$committedValue = [];
      this._$clear();
    }

    // Lets us keep track of how many items we stamped so we can clear leftover
    // items from a previous render
    const itemParts = this._$committedValue as ChildPart[];
    let partIndex = 0;
    let itemPart: ChildPart | undefined;

    for (const item of value) {
      if (partIndex === itemParts.length) {
        // If no existing part, create a new one
        // TODO (justinfagnani): test perf impact of always creating two parts
        // instead of sharing parts between nodes
        // https://github.com/lit/lit/issues/1266
        itemParts.push(
          (itemPart = new ChildPart(
            this._insert(createMarker()),
            this._insert(createMarker()),
            this,
            this.options
          ))
        );
      } else {
        // Reuse an existing part
        itemPart = itemParts[partIndex];
      }
      itemPart._$setValue(item);
      partIndex++;
    }

    if (partIndex < itemParts.length) {
      // itemParts always have end nodes
      this._$clear(
        itemPart && wrap(itemPart._$endNode!).nextSibling,
        partIndex
      );
      // Truncate the parts array so _value reflects the current state
      itemParts.length = partIndex;
    }
  }

  /**
   * Removes the nodes contained within this Part from the DOM.
   *
   * @param start Start node to clear from, for clearing a subset of the part's
   *     DOM (used when truncating iterables)
   * @param from  When `start` is specified, the index within the iterable from
   *     which ChildParts are being removed, used for disconnecting directives in
   *     those Parts.
   *
   * @internal
   */
  _$clear(
    start: ChildNode | null = wrap(this._$startNode).nextSibling,
    from?: number
  ) {
    this._$setChildPartConnected?.(false, true, from);
    while (start && start !== this._$endNode) {
      const n = wrap(start!).nextSibling;
      (wrap(start!) as Element).remove();
      start = n;
    }
  }
}

export type {AttributePart};
class AttributePart {
  readonly type = ATTRIBUTE_PART as
    | typeof ATTRIBUTE_PART
    | typeof PROPERTY_PART
    | typeof BOOLEAN_ATTRIBUTE_PART
    | typeof EVENT_PART;
  readonly element: Element;
  readonly name: string;
  readonly options: RenderOptions | undefined;

  /**
   * If this attribute part represents an interpolation, this contains the
   * static strings of the interpolation. For single-value, complete bindings,
   * this is undefined.
   */
  readonly strings?: ReadonlyArray<string>;
  /** @internal */
  _$committedValue: unknown | Array<unknown> = nothing;
  /** @internal */
  __directives?: Array<Directive | undefined>;
  /** @internal */
  _$parent: Disconnectable | undefined;
  /** @internal */
  _$disconnectableChildren?: Set<Disconnectable> = undefined;

  protected _sanitizer: ValueSanitizer | undefined;

  get tagName() {
    return this.element.tagName;
  }

  constructor(
    element: Element,
    name: string,
    strings: ReadonlyArray<string>,
    parent: Disconnectable | undefined,
    options: RenderOptions | undefined
  ) {
    this.element = element;
    this.name = name;
    this._$parent = parent;
    this.options = options;
    if (strings.length > 2 || strings[0] !== '' || strings[1] !== '') {
      this._$committedValue = new Array(strings.length - 1).fill(nothing);
      this.strings = strings;
    } else {
      this._$committedValue = nothing;
    }
    if (ENABLE_EXTRA_SECURITY_HOOKS) {
      this._sanitizer = undefined;
    }
  }

  /**
   * Sets the value of this part by resolving the value from possibly multiple
   * values and static strings and committing it to the DOM.
   * If this part is single-valued, `this._strings` will be undefined, and the
   * method will be called with a single value argument. If this part is
   * multi-value, `this._strings` will be defined, and the method is called
   * with the value array of the part's owning TemplateInstance, and an offset
   * into the value array from which the values should be read.
   * This method is overloaded this way to eliminate short-lived array slices
   * of the template instance values, and allow a fast-path for single-valued
   * parts.
   *
   * @param value The part value, or an array of values for multi-valued parts
   * @param valueIndex the index to start reading values from. `undefined` for
   *   single-valued parts
   * @param noCommit causes the part to not commit its value to the DOM. Used
   *   in hydration to prime attribute parts with their first-rendered value,
   *   but not set the attribute, and in SSR to no-op the DOM operation and
   *   capture the value for serialization.
   *
   * @internal
   */
  _$setValue(
    value: unknown | Array<unknown>,
    directiveParent: DirectiveParent = this,
    valueIndex?: number,
    noCommit?: boolean
  ) {
    const strings = this.strings;

    // Whether any of the values has changed, for dirty-checking
    let change = false;

    if (strings === undefined) {
      // Single-value binding case
      value = resolveDirective(this, value, directiveParent, 0);
      change =
        !isPrimitive(value) ||
        (value !== this._$committedValue && value !== noChange);
      if (change) {
        this._$committedValue = value;
      }
    } else {
      // Interpolation case
      const values = value as Array<unknown>;
      value = strings[0];

      let i, v;
      for (i = 0; i < strings.length - 1; i++) {
        v = resolveDirective(this, values[valueIndex! + i], directiveParent, i);

        if (v === noChange) {
          // If the user-provided value is `noChange`, use the previous value
          v = (this._$committedValue as Array<unknown>)[i];
        }
        change ||=
          !isPrimitive(v) || v !== (this._$committedValue as Array<unknown>)[i];
        if (v === nothing) {
          value = nothing;
        } else if (value !== nothing) {
          value += (v ?? '') + strings[i + 1];
        }
        // We always record each value, even if one is `nothing`, for future
        // change detection.
        (this._$committedValue as Array<unknown>)[i] = v;
      }
    }
    if (change && !noCommit) {
      this._commitValue(value);
    }
  }

  /** @internal */
  _commitValue(value: unknown) {
    if (value === nothing) {
      (wrap(this.element) as Element).removeAttribute(this.name);
    } else {
      if (ENABLE_EXTRA_SECURITY_HOOKS) {
        if (this._sanitizer === undefined) {
          this._sanitizer = sanitizerFactoryInternal(
            this.element,
            this.name,
            'attribute'
          );
        }
        value = this._sanitizer(value ?? '');
      }
      (wrap(this.element) as Element).setAttribute(
        this.name,
        (value ?? '') as string
      );
    }
  }
}

export type {PropertyPart};
class PropertyPart extends AttributePart {
  readonly type = PROPERTY_PART;

  /** @internal */
  _commitValue(value: unknown) {
    if (ENABLE_EXTRA_SECURITY_HOOKS) {
      if (this._sanitizer === undefined) {
        this._sanitizer = sanitizerFactoryInternal(
          this.element,
          this.name,
          'property'
        );
      }
      value = this._sanitizer(value);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.element as any)[this.name] = value === nothing ? undefined : value;
  }
}

export type {BooleanAttributePart};
class BooleanAttributePart extends AttributePart {
  readonly type = BOOLEAN_ATTRIBUTE_PART;

  /** @internal */
  _commitValue(value: unknown) {
    if (value && value !== nothing) {
      (wrap(this.element) as Element).setAttribute(this.name, '');
    } else {
      (wrap(this.element) as Element).removeAttribute(this.name);
    }
  }
}

type EventListenerWithOptions = EventListenerOrEventListenerObject &
  Partial<AddEventListenerOptions>;

/**
 * An AttributePart that manages an event listener via add/removeEventListener.
 *
 * This part works by adding itself as the event listener on an element, then
 * delegating to the value passed to it. This reduces the number of calls to
 * add/removeEventListener if the listener changes frequently, such as when an
 * inline function is used as a listener.
 *
 * Because event options are passed when adding listeners, we must take case
 * to add and remove the part as a listener when the event options change.
 */
export type {EventPart};
class EventPart extends AttributePart {
  readonly type = EVENT_PART;

  // EventPart does not use the base _$setValue/_resolveValue implementation
  // since the dirty checking is more complex
  /** @internal */
  _$setValue(newListener: unknown, directiveParent: DirectiveParent = this) {
    newListener =
      resolveDirective(this, newListener, directiveParent, 0) ?? nothing;
    if (newListener === noChange) {
      return;
    }
    const oldListener = this._$committedValue;

    // If the new value is nothing or any options change we have to remove the
    // part as a listener.
    const shouldRemoveListener =
      (newListener === nothing && oldListener !== nothing) ||
      (newListener as EventListenerWithOptions).capture !==
        (oldListener as EventListenerWithOptions).capture ||
      (newListener as EventListenerWithOptions).once !==
        (oldListener as EventListenerWithOptions).once ||
      (newListener as EventListenerWithOptions).passive !==
        (oldListener as EventListenerWithOptions).passive;

    // If the new value is not nothing and we removed the listener, we have
    // to add the part as a listener.
    const shouldAddListener =
      newListener !== nothing &&
      (oldListener === nothing || shouldRemoveListener);

    if (shouldRemoveListener) {
      this.element.removeEventListener(
        this.name,
        this,
        oldListener as EventListenerWithOptions
      );
    }
    if (shouldAddListener) {
      // Beware: IE11 and Chrome 41 don't like using the listener as the
      // options object. Figure out how to deal w/ this in IE11 - maybe
      // patch addEventListener?
      this.element.addEventListener(
        this.name,
        this,
        newListener as EventListenerWithOptions
      );
    }
    this._$committedValue = newListener;
  }

  handleEvent(event: Event) {
    if (typeof this._$committedValue === 'function') {
      // TODO (justinfagnani): do we need to default to this.element?
      // It'll always be the same as `e.currentTarget`.
      this._$committedValue.call(this.options?.host ?? this.element, event);
    } else {
      (this._$committedValue as EventListenerObject).handleEvent(event);
    }
  }
}

export type {ElementPart};
class ElementPart {
  readonly type = ELEMENT_PART;

  /** @internal */
  __directive?: Directive;

  // This is to ensure that every Part has a _$committedValue
  _$committedValue: undefined;

  /** @internal */
  _$parent: Disconnectable | undefined;

  /** @internal */
  _$disconnectableChildren?: Set<Disconnectable> = undefined;

  options: RenderOptions | undefined;

  constructor(
    public element: Element,
    parent: Disconnectable,
    options: RenderOptions | undefined
  ) {
    this._$parent = parent;
    this.options = options;
  }

  _$setValue(value: unknown): void {
    resolveDirective(this, value);
  }
}

/**
 * END USERS SHOULD NOT RELY ON THIS OBJECT.
 *
 * Private exports for use by other Lit packages, not intended for use by
 * external users.
 *
 * We currently do not make a mangled rollup build of the lit-ssr code. In order
 * to keep a number of (otherwise private) top-level exports  mangled in the
 * client side code, we export a _$LH object containing those members (or
 * helper methods for accessing private fields of those members), and then
 * re-export them for use in lit-ssr. This keeps lit-ssr agnostic to whether the
 * client-side code is being used in `dev` mode or `prod` mode.
 *
 * This has a unique name, to disambiguate it from private exports in
 * lit-element, which re-exports all of lit-html.
 *
 * @private
 */
export const _$LH = {
  // Used in lit-ssr
  _boundAttributeSuffix: boundAttributeSuffix,
  _marker: marker,
  _markerMatch: markerMatch,
  _HTML_RESULT: HTML_RESULT,
  _getTemplateHtml: getTemplateHtml,
  // Used in hydrate
  _TemplateInstance: TemplateInstance,
  _isIterable: isIterable,
  _resolveDirective: resolveDirective,
  // Used in tests and private-ssr-support
  _ChildPart: ChildPart,
  _AttributePart: AttributePart,
  _BooleanAttributePart: BooleanAttributePart,
  _EventPart: EventPart,
  _PropertyPart: PropertyPart,
  _ElementPart: ElementPart,
};

// Apply polyfills if available
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any)['litHtmlPlatformSupport']?.(Template, ChildPart);

// IMPORTANT: do not change the property name or the assignment expression.
// This line will be used in regexes to search for lit-html usage.
// TODO(justinfagnani): inject version number at build time
// eslint-disable-next-line @typescript-eslint/no-explicit-any
((globalThis as any)['litHtmlVersions'] ??= []).push('2.0.0-rc.3');
