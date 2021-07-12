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

import {store} from '../store.js';
import {connect} from 'pwa-helpers/connect-mixin.js';
import {reloadCategory} from '../actions/app.js';

class ShopNetworkWarning extends connect(store)(LitElement) {
  render() {
    return html` ${shopButtonStyle}
      <style>
        :host {
          display: block;
          padding: 40px 20px;
          text-align: center;
          color: var(--app-secondary-color);
        }

        iron-icon {
          display: inline-block;
          width: 30px;
          height: 30px;
        }

        h1 {
          margin: 50px 0 10px 0;
          font-weight: 300;
        }

        p {
          margin: 0;
        }

        shop-button {
          margin-top: 50px;
        }
      </style>

      <div>
        ${this._offline
          ? html`
              <iron-icon icon="perm-scan-wifi"></iron-icon>
              <h1>No internet connection</h1>
              <p>
                Check if your device is connected to a mobile network or WiFi.
              </p>
            `
          : html` <h1>Couldn't reach the server</h1> `}
      </div>
      <shop-button>
        <button @click="${this._tryReconnect}">Try Again</button>
      </shop-button>`;
  }

  static get properties() {
    return {
      _offline: {type: Boolean},
    };
  }

  stateChanged(state) {
    this._offline = state.app.offline;
  }

  _tryReconnect() {
    store.dispatch(reloadCategory());
  }
}

customElements.define('shop-network-warning', ShopNetworkWarning);
