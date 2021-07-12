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
import {shopSelectStyle} from './shop-select-style.js';
import '@polymer/paper-icon-button';
import './shop-icons.js';
import './shop-image.js';

import {store} from '../store.js';
import {editCart, removeFromCart} from '../actions/cart.js';

class ShopCartItem extends LitElement {
  render() {
    const entry = this.entry;
    return html` ${shopSelectStyle}
      <style>
        :host {
          display: flex;
          position: relative;
          margin-bottom: 24px;
        }

        shop-image {
          width: 72px;
          height: 72px;
        }

        /* Add more specificity (.quantity) to workaround an issue in lit-element:
         https://github.com/PolymerLabs/lit-element/issues/34 */
        .quantity > shop-select > select {
          font-size: 16px;
          padding-left: 40px;
        }

        .quantity > shop-select > shop-md-decorator {
          font-size: 12px;
          border: none;
        }

        .name {
          flex: auto;
          line-height: 20px;
          font-weight: 500;
          float: left;
          width: calc(100% - 438px);
          margin-top: 26px;
          margin-right: 30px;
        }

        .name a {
          display: inline-block;
          max-width: 100%;
          text-decoration: none;
          color: var(--app-primary-color);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .price,
        .size {
          display: inline-block;
          white-space: nowrap;
          color: var(--app-secondary-color);
        }

        .size {
          min-width: 70px;
          width: 144px;
        }

        .size > span {
          margin-left: 10px;
        }

        .price {
          min-width: 70px;
          width: 100px;
        }

        .quantity {
          min-width: 80px;
          width: 160px;
        }

        .delete-button {
          width: 34px;
          height: 34px;
          color: var(--app-secondary-color);
          position: absolute;
          top: 18px;
          right: 0;
        }

        .flex {
          display: flex;
          flex: auto;
          margin-left: 24px;
        }

        .detail {
          display: flex;
          align-items: center;
          margin-top: 26px;
          margin-right: 30px;
          height: 20px;
        }

        @media (max-width: 767px) {
          .flex {
            flex-direction: column;
            margin-left: 10px;
          }

          .name {
            margin-top: 16px;
            margin-right: 0;
            width: calc(100% - 40px);
          }

          .detail {
            align-self: flex-end;
            margin: 10px 10px 0 0;
          }

          .quantity,
          .size,
          .price {
            text-align: right;
            width: auto;
          }

          .delete-button {
            top: 8px;
          }
        }

        @media (max-width: 360px) {
          .name {
            margin-top: 0;
          }

          .detail {
            flex-direction: column;
            align-items: flex-start;
            align-self: flex-start;
            height: auto;
            margin-top: 0;
          }

          .delete-button {
            top: -6px;
          }

          shop-select > select {
            padding: 2px 24px 2px 40px;
          }

          .quantity,
          .size,
          .price {
            text-align: left;
            width: auto;
          }
        }
      </style>

      ${entry && entry.item
        ? html`
            <a
              href="/detail/${entry.item.category}/${entry.item.name}"
              title="${entry.item.title}"
            >
              <shop-image
                src="${entry.item.image}"
                alt="${entry.item.title}"
              ></shop-image>
            </a>
            <div class="flex">
              <div class="name">
                <a href="/detail/${entry.item.category}/${entry.item.name}"
                  >${entry.item.title}</a
                >
              </div>
              <div class="detail">
                <div class="quantity">
                  <shop-select>
                    <label prefix>Qty:</label>
                    <select
                      id="quantitySelect"
                      aria-label="Change quantity"
                      .value="${entry.quantity}"
                      @change="${this._quantityChange}"
                    >
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                      <option value="6">6</option>
                      <option value="7">7</option>
                      <option value="8">8</option>
                      <option value="9">9</option>
                      <option value="10">10</option>
                      <option value="11">11</option>
                      <option value="12">12</option>
                    </select>
                    <shop-md-decorator aria-hidden="true"></shop-md-decorator>
                  </shop-select>
                </div>
                <div class="size">Size: <span>${entry.size}</span></div>
                <div class="price">$${entry.item.price.toFixed(2)}</div>

                <!--
            Use @click instead of @tap to prevent the next cart item to be focused
          -->
                <paper-icon-button
                  class="delete-button"
                  icon="close"
                  aria-label="Delete item ${entry.item.title}"
                  @click="${this._removeItem}"
                ></paper-icon-button>
              </div>
            </div>
          `
        : null}`;
  }

  static get properties() {
    return {
      entry: {type: Object},
    };
  }

  _quantityChange(e) {
    store.dispatch(
      editCart({
        item: this.entry.item,
        quantity: parseInt(e.target.value, 10),
        size: this.entry.size,
      })
    );
  }

  _removeItem() {
    store.dispatch(
      removeFromCart({
        item: this.entry.item,
        size: this.entry.size,
      })
    );
  }
}

customElements.define('shop-cart-item', ShopCartItem);
