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
import {unsafeHTML} from 'lit/directives/unsafe-html.js';
import {shopButtonStyle} from './shop-button-style.js';
import {shopCommonStyle} from './shop-common-style.js';
import {shopSelectStyle} from './shop-select-style.js';
import './shop-image.js';

import {store} from '../store.js';
import {connect} from 'pwa-helpers/connect-mixin.js';
import {
  currentCategorySelector,
  currentItemSelector,
} from '../reducers/categories.js';
import {addToCart} from '../actions/cart.js';

class ShopDetail extends connect(store)(PageViewElement) {
  render() {
    return html` ${shopButtonStyle} ${shopCommonStyle} ${shopSelectStyle}
      <style>
        :host {
          display: block;
        }

        #content {
          display: flex;
          flex-direction: row;
          justify-content: center;
        }

        shop-image {
          position: relative;
          margin: 64px 32px;
          width: 50%;
          max-width: 600px;
        }

        shop-image::before {
          content: '';
          display: block;
          padding-top: 100%;
        }

        .detail {
          margin: 64px 32px;
          width: 50%;
          max-width: 400px;
          transition: opacity 0.4s;
          opacity: 0;
        }

        .detail[has-content] {
          opacity: 1;
        }

        h1 {
          font-size: 24px;
          font-weight: 500;
          line-height: 28px;
          margin: 0;
        }

        .price {
          margin: 16px 0 40px;
          font-size: 16px;
          color: var(--app-secondary-color);
        }

        .description {
          margin: 32px 0;
        }

        .description > h2 {
          margin: 16px 0;
          font-size: 13px;
        }

        .description > p {
          margin: 0;
          color: var(--app-secondary-color);
        }

        .pickers {
          display: flex;
          flex-direction: column;
          border-top: 1px solid #ccc;
        }

        /* Add more specificity (.pickers) to workaround an issue in lit-element:
         https://github.com/PolymerLabs/lit-element/issues/34 */
        .pickers > shop-select > select {
          font-size: 16px;
          padding: 16px 24px 16px 70px;
        }

        @media (max-width: 767px) {
          #content {
            flex-direction: column;
            align-items: center;
          }

          shop-image {
            margin: 0;
            width: 80%;
          }

          .detail {
            box-sizing: border-box;
            margin: 32px 0;
            padding: 0 24px;
            width: 100%;
            max-width: 600px;
          }

          h1 {
            font-size: 20px;
            line-height: 24px;
          }

          .price {
            font-size: inherit;
            margin: 12px 0 32px;
          }
        }
      </style>

      <div id="content" ?hidden="${this._failure || !this._item}">
        <shop-image
          alt="${this._item.title}"
          src="${this._item.largeImage}"
        ></shop-image>
        <div class="detail" has-content>
          <h1>${this._item.title}</h1>
          <div class="price">
            ${this._item.price ? `$${this._item.price.toFixed(2)}` : null}
          </div>
          <div class="pickers">
            <shop-select>
              <label id="sizeLabel" prefix>Size</label>
              <select id="sizeSelect" aria-labelledby="sizeLabel">
                <option value="XS">XS</option>
                <option value="S">S</option>
                <option value="M" selected>M</option>
                <option value="L">L</option>
                <option value="XL">XL</option>
              </select>
              <shop-md-decorator aria-hidden="true">
                <shop-underline></shop-underline>
              </shop-md-decorator>
            </shop-select>
            <shop-select>
              <label id="quantityLabel" prefix>Quantity</label>
              <select id="quantitySelect" aria-labelledby="quantityLabel">
                <option value="1" selected>1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
              </select>
              <shop-md-decorator aria-hidden="true">
                <shop-underline></shop-underline>
              </shop-md-decorator>
            </shop-select>
          </div>
          <div class="description">
            <h2>Description</h2>
            <p>
              ${this._item
                ? unsafeHTML(this._unescapeText(this._item.description))
                : null}
            </p>
          </div>
          <shop-button responsive>
            <button
              @click="${this._addToCart}"
              aria-label="Add this item to cart"
            >
              Add to Cart
            </button>
          </shop-button>
        </div>
      </div>

      <!--
      shop-network-warning shows a warning message when the items can't be rendered due
      to network conditions.
    -->
      <shop-network-warning
        ?hidden="${!this._failure}"
      ></shop-network-warning>`;
  }

  static get properties() {
    return {
      _item: {type: Object},

      _failure: {type: Boolean},
    };
  }

  stateChanged(state) {
    const category = currentCategorySelector(state);
    this._item = currentItemSelector(state) || {};
    this._failure = category && category.failure;
  }

  _unescapeText(text) {
    // The item description contains escaped HTML (e.g. "&lt;br&gt;"), so we need to
    // unescape it ("<br>") and set it as innerHTML.
    let elem = document.createElement('textarea');
    elem.innerHTML = text;
    return elem.textContent;
  }

  _addToCart() {
    const quantitySelect = this.shadowRoot.querySelector('#quantitySelect');
    const sizeSelect = this.shadowRoot.querySelector('#sizeSelect');
    store.dispatch(
      addToCart({
        item: this._item,
        quantity: parseInt(quantitySelect.value, 10),
        size: sizeSelect.value,
      })
    );
  }

  _isDefined(item) {
    return item != null;
  }
}

customElements.define('shop-detail', ShopDetail);
