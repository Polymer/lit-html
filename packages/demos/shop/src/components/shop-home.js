/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

import {PageViewElement} from './page-view-element.js';
import {html} from 'lit';
import {repeat} from 'lit/directives/repeat.js';
import {shopButtonStyle} from './shop-button-style.js';
import './shop-image.js';

import {store} from '../store.js';
import {connect} from 'pwa-helpers/connect-mixin.js';

class ShopHome extends connect(store)(PageViewElement) {
  render() {
    return html` ${shopButtonStyle}
      <style>
        .image-link {
          outline: none;
        }

        .image-link > shop-image::after {
          display: block;
          content: '';
          position: absolute;
          transition-property: opacity;
          transition-duration: 0s;
          transition-delay: 90ms;
          pointer-events: none;
          opacity: 0;
          top: 5px;
          left: 5px;
          right: 5px;
          bottom: 5px;
          outline: #2196f3 auto 5px;
          outline: -moz-mac-focusring auto 5px;
          outline: -webkit-focus-ring-color auto 5px;
        }

        .image-link:focus > shop-image::after {
          opacity: 1;
        }

        .item {
          display: block;
          text-decoration: none;
          text-align: center;
          margin-bottom: 40px;
        }

        .item:nth-of-type(3),
        .item:nth-of-type(4) {
          display: inline-block;
          width: 50%;
        }

        shop-image {
          position: relative;
          height: 320px;
          overflow: hidden;
        }

        h2 {
          font-size: 1.3em;
          font-weight: 500;
          margin: 32px 0;
        }

        .item:nth-of-type(3) > h2,
        .item:nth-of-type(4) > h2 {
          font-size: 1.1em;
        }

        @media (max-width: 767px) {
          shop-image {
            height: 240px;
          }

          h2 {
            margin: 24px 0;
          }

          .item:nth-of-type(3) > shop-button > a,
          .item:nth-of-type(4) > shop-button > a {
            padding: 8px 24px;
          }
        }
      </style>

      ${repeat(Object.keys(this._categories), (key) => {
        const category = this._categories[key];
        return html`<div class="item">
          <a class="image-link" href="/list/${category.name}">
            <shop-image
              src="${category.image}"
              alt="${category.title}"
              placeholder="${category.placeholder}"
            ></shop-image>
          </a>
          <h2>${category.title}</h2>
          <shop-button>
            <a
              aria-label="${category.title} Shop Now"
              href="/list/${category.name}"
              >Shop Now</a
            >
          </shop-button>
        </div>`;
      })}`;
  }

  static get properties() {
    return {
      _categories: {type: Object},
    };
  }

  stateChanged(state) {
    this._categories = state.categories;
  }
}

customElements.define('shop-home', ShopHome);
