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
import {shopCommonStyle} from './shop-common-style.js';
import {shopFormStyle} from './shop-form-style.js';

import {store} from '../store.js';
import {connect} from 'pwa-helpers/connect-mixin.js';
import {totalSelector} from '../reducers/cart.js';

class ShopCart extends connect(store)(PageViewElement) {
  render() {
    const cart = this._cart;
    const cartList = cart ? Object.keys(cart).map((key) => cart[key]) : [];

    return html` ${shopButtonStyle} ${shopCommonStyle} ${shopFormStyle}
      <style>
        .list {
          margin: 40px 0;
        }

        .checkout-box {
          font-weight: bold;
          text-align: right;
          margin-right: 10px;
        }

        .subtotal {
          margin: 0 64px 0 24px;
        }

        @media (max-width: 767px) {
          .subtotal {
            margin: 0 0 0 24px;
          }
        }
      </style>

      <div class="main-frame">
        <div class="subsection">
          ${cartList.length > 0
            ? html`
                <header>
                  <h1>Your Cart</h1>
                  <span
                    >${`(${cartList.length} item${
                      cartList.length > 1 ? 's' : ''
                    })`}</span
                  >
                </header>
                <div class="list">
                  ${repeat(
                    cartList,
                    (entry) => html`
                      <shop-cart-item .entry="${entry}"></shop-cart-item>
                    `
                  )}
                </div>
                <div class="checkout-box">
                  Total:
                  <span class="subtotal">$${this._total.toFixed(2)}</span>
                  <shop-button responsive>
                    <a href="/checkout">Checkout</a>
                  </shop-button>
                </div>
              `
            : html`
                <p class="empty-cart">
                  Your <iron-icon icon="shopping-cart"></iron-icon> is empty.
                </p>
              `}
        </div>
      </div>`;
  }

  static get properties() {
    return {
      _total: {type: Number},

      _cart: {type: Object},
    };
  }

  stateChanged(state) {
    this._cart = state.cart;
    this._total = totalSelector(state);
  }
}

customElements.define('shop-cart', ShopCart);
