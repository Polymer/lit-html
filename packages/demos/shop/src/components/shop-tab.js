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
import './shop-ripple-container.js';

class ShopTab extends LitElement {
  render() {
    return html` <style>
        [hidden] {
          display: none !important;
        }

        :host {
          display: inline-block;
          position: relative;
        }

        #overlay {
          pointer-events: none;
          display: none;
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          border-bottom: 2px solid var(--app-accent-color);
        }

        :host(.shop-tabs-overlay-static-above) #overlay {
          display: block;
        }
      </style>
      <div id="overlay"></div>
      <shop-ripple-container>
        <slot></slot>
      </shop-ripple-container>`;
  }
}

customElements.define('shop-tab', ShopTab);
