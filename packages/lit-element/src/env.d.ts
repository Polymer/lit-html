/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

interface ShadyCSS {
  nativeCss: boolean;
  nativeShadow: boolean;
  styleElement(host: Element, overrideProps?: {[key: string]: string}): void;
  styleSubtree(host: Element, overrideProps?: {[key: string]: string}): void;
  getComputedStyleValue(element: Element, property: string): string;
  ApplyShim: unknown;
  prepareTemplateDom(template: Element, elementName: string): void;
  prepareTemplateStyles(template: Element, elementName: string): void;
  ScopingShim:
    | undefined
    | {
        prepareAdoptedCssText(
          cssTextArray: string[],
          elementName: string
        ): void;
      };
}

interface ShadyDOM {
  inUse: boolean;
  flush: () => void;
  noPatch: boolean | string;
  wrap: (node: Node) => Node;
}

interface LitExtendedWindow extends Window {
  ShadyCSS?: ShadyCSS;
  ShadyDOM?: ShadyDOM;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reactiveElementPlatformSupport: (options: {[index: string]: any}) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  litElementPlatformSupport: (options: {[index: string]: any}) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  litHtmlPlatformSupport: (template: unknown, childPart: unknown) => void;
}

type LitExtraGlobals = typeof globalThis & LitExtendedWindow;

// Augment existing types with styling API
interface ShadowRoot {
  adoptedStyleSheets: CSSStyleSheet[];
}

// eslint-disable-next-line no-var
declare var ShadowRoot: {prototype: ShadowRoot; new (): ShadowRoot};

interface CSSStyleSheet {
  replaceSync(cssText: string): void;
  replace(cssText: string): Promise<unknown>;
}
