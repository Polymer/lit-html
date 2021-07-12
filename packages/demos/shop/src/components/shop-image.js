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

class ShopImage extends LitElement {
  render() {
    return html` <style>
        :host {
          display: block;
          position: relative;
        }

        #placeholder {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          right: 0;
          overflow: hidden;
          background-size: cover;
          background-position: center;
        }

        img {
          max-width: 100%;
          max-height: 100%;
          margin: 0 auto;
          opacity: 0;
          transition: none;

          position: absolute;
          top: 0;
          bottom: 0;
          left: -9999px;
          right: -9999px;
          max-width: none;
        }

        img.loaded {
          opacity: 1;
          transition: 0.5s opacity;
        }
      </style>

      <div
        id="placeholder"
        style="background-image: url('${this.placeholder || ''}')"
      >
        <img
          src="${this.src}"
          alt="${this.alt}"
          class="${this._loaded ? 'loaded' : ''}"
          @load="${this._onImgLoad}"
          @error="${this._onImgError}"
        />
      </div>`;
  }

  static get properties() {
    return {
      alt: {type: String},

      src: {type: String},

      placeholder: {type: String},

      _loaded: {type: Boolean},
    };
  }

  update(changedProps) {
    if (changedProps.has('src')) {
      this._loaded = false;
    }
    super.update(changedProps);
  }

  _onImgLoad() {
    this._loaded = true;
  }

  _onImgError() {
    if (!this.placeholder) {
      this.src =
        'data:image/svg+xml,' +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#CCC" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>'
        );
    }
  }
}

customElements.define('shop-image', ShopImage);
