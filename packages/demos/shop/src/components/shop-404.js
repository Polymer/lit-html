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
import {shopButtonStyle} from './shop-button-style.js';
import '@polymer/iron-icon';
import './shop-icons.js';

class Shop404Warning extends LitElement {
  render() {
    return html` ${shopButtonStyle}
      <style>
        :host {
          display: block;
          text-align: center;
          color: var(--app-secondary-color);
        }

        iron-icon {
          display: inline-block;
          width: 60px;
          height: 60px;
        }

        h1 {
          margin: 50px 0 50px 0;
          font-weight: 300;
        }
      </style>

      <div>
        <iron-icon icon="error"></iron-icon>
        <h1>Sorry, we couldn't find that page</h1>
      </div>
      <shop-button>
        <a href="/">Go to the home page</a>
      </shop-button>`;
  }
}

customElements.define('shop-404-warning', Shop404Warning);
