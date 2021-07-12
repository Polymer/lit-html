/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {LitElement} from 'lit';
import {adoptStyles} from '@lit/reactive-element/css-tag.js';

// Proposed interface changes
declare global {
  interface ShadowRootInit {
    customElements?: CustomElementRegistry;
  }
  interface ShadowRoot {
    adoptNode: Document['adoptNode'];
    customElements?: CustomElementRegistry;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LitElementConstructor = new (...args: any[]) => LitElement;

export type ElementDefinitionsMap = {
  [key: string]: typeof HTMLElement;
};

export function ScopedRegistryHost<SuperClass extends LitElementConstructor>(
  superclass: SuperClass
): SuperClass {
  return class ScopedRegistryMixin extends superclass {
    /**
     * Obtains the scoped elements definitions map
     */
    static elementDefinitions?: ElementDefinitionsMap;
    static registry?: CustomElementRegistry;

    createRenderRoot() {
      const constructor = this.constructor as typeof ScopedRegistryMixin &
        typeof LitElement;

      const {registry, elementDefinitions, shadowRootOptions} = constructor;

      if (elementDefinitions && !registry) {
        constructor.registry = new CustomElementRegistry();

        Object.entries(elementDefinitions).forEach(([tagName, klass]) =>
          constructor.registry!.define(tagName, klass)
        );
      }

      const renderRoot = (this.renderOptions.creationScope = this.attachShadow({
        ...shadowRootOptions,
        customElements: constructor.registry,
      }));

      adoptStyles(
        renderRoot,
        (this.constructor as typeof LitElement).elementStyles!
      );

      return renderRoot;
    }
  };
}
