/**
 * @license
 * Copyright (c) 2019 The Polymer Project Authors. All rights reserved.
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

/**
 * This module *minimally* implements the DOM interfaces needed for lit-html and
 * LitElement to boot. Since most of the implementation of lit-html and
 * LitElement are not actually used, we mostly just need to defining base
 * classes for extension, etc. We will have a roughly functioning
 * CustomElementRegistry however.
 */

// import fetch from 'node-fetch';

/**
 * Constructs a fresh instance of the "window" vm context to use for
 * evaluating user SSR code.  Includes a minimal shim of DOM APIs.
 *
 * @param props Additional properties to add to the window global
 */
export const getWindow = (
  props: {[key: string]: unknown} = {}
): {[key: string]: unknown} => {
  const attributes: WeakMap<HTMLElement, Map<string, string>> = new WeakMap();
  const attributesForElement = (element: HTMLElement) => {
    let attrs = attributes.get(element);
    if (!attrs) {
      attributes.set(element, (attrs = new Map()));
    }
    return attrs;
  };

  class Element {}

  abstract class HTMLElement extends Element {
    get attributes() {
      return Array.from(attributesForElement(this)).map(([name, value]) => ({
        name,
        value,
      }));
    }
    abstract attributeChangedCallback?(
      name: string,
      old: string | null,
      value: string | null
    ): void;
    setAttribute(name: string, value: string) {
      attributesForElement(this).set(name, value);
    }
    removeAttribute(name: string) {
      attributesForElement(this).delete(name);
    }
    hasAttribute(name: string) {
      return attributesForElement(this).has(name);
    }
    attachShadow() {
      return {host: this};
    }
    getAttribute(name: string) {
      const value = attributesForElement(this).get(name);
      return value === undefined ? null : value;
    }
  }

  interface CustomHTMLElement {
    new (): HTMLElement;
    observedAttributes?: string[];
  }

  class ShadowRoot {}

  class Document {
    get adoptedStyleSheets() {
      return [];
    }
    createTreeWalker() {
      return {};
    }
  }

  class CSSStyleSheet {
    replace() {}
  }

  type CustomElementRegistration = {
    ctor: {new (): HTMLElement};
    observedAttributes: string[];
  };

  class CustomElementRegistry {
    __definitions = new Map<string, CustomElementRegistration>();

    define(name: string, ctor: CustomHTMLElement) {
      this.__definitions.set(name, {
        ctor,
        observedAttributes:
          (ctor as CustomHTMLElement).observedAttributes ?? [],
      });
    }

    get(name: string) {
      const definition = this.__definitions.get(name);
      return definition && definition.ctor;
    }
  }

  const window = {
    Element,
    HTMLElement,
    Document,
    document: new Document(),
    CSSStyleSheet,
    ShadowRoot,
    customElements: new CustomElementRegistry(),
    btoa(s: string) {
      return Buffer.from(s, 'binary').toString('base64');
    },
    // console: {
    //   log(...args: unknown[]) {
    //     console.log(...args);
    //   },
    //   info(...args: unknown[]) {
    //     console.info(...args);
    //   },
    //   warn(...args: unknown[]) {
    //     console.warn(...args);
    //   },
    //   debug(...args: unknown[]) {
    //     console.debug(...args);
    //   },
    //   error(...args: unknown[]) {
    //     console.error(...args);
    //   },
    //   assert(bool: unknown, msg: string) {
    //     if (!bool) {
    //       throw new Error(msg);
    //     }
    //   },
    // },
    // fetch: (url: URL, init: {}) => fetch(url, init),

    // No-op any async tasks
    requestAnimationFrame() {},
    setTimeout() {},
    clearTimeout() {},

    // Required for node-fetch
    // Buffer,

    // Set below
    window: undefined as unknown,
    // global: undefined as unknown,

    // User-provided globals, like `require`
    ...props,
  };

  window.window = window;
  // window.global = window; // Required for node-fetch

  return window;
};
