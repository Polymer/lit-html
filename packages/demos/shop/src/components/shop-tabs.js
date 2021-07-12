/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

import {LitElement, html} from 'lit';
import './shop-tabs-overlay.js';

class ShopTabs extends LitElement {
  render() {
    return html` <style>
        :host {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        #container {
          position: relative;
        }

        shop-tabs-overlay {
          border-bottom: 2px solid var(--app-accent-color);
        }
      </style>
      <div id="container">
        <shop-tabs-overlay
          .target="${this.children[this.selectedIndex]}"
        ></shop-tabs-overlay>
        <slot></slot>
      </div>`;
  }

  static get properties() {
    return {
      /**
       * The index of the selected element.
       */
      selectedIndex: {type: Number},
    };
  }
}

customElements.define('shop-tabs', ShopTabs);
