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

class ShopListItem extends LitElement {
  render() {
    const item = this.item || {};
    return html` <style>
        :host {
          display: flex;
          flex-direction: column;
          text-align: center;
          margin: 0 48px;
        }

        shop-image {
          margin: 32px 0 16px;
        }

        shop-image::before {
          content: '';
          display: block;
          padding-top: 100%;
        }

        .title {
          color: var(--app-primary-color);
          font-weight: bold;
        }

        .price {
          color: var(--app-secondary-color);
        }

        @media (max-width: 767px) {
          :host {
            margin: 0 12px;
          }
        }
      </style>

      <shop-image src="${item.image}" alt="${item.title}"></shop-image>
      <div class="title">${item.title}</div>
      <span class="price"
        >${item.price ? `$${item.price.toFixed(2)}` : null}</span
      >`;
  }

  static get properties() {
    return {
      item: {type: Object},
    };
  }
}

customElements.define('shop-list-item', ShopListItem);
