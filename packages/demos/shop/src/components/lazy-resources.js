/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

// shop-app
import "./shop-icons.js";
import "./shop-analytics.js";
import "./shop-cart-button.js";
import "./shop-cart-modal.js";
import "./shop-snackbar.js";
import "./shop-tabs.js";
import "./shop-tab.js";
import "@polymer/paper-icon-button";
import "@polymer/app-layout/app-drawer/app-drawer.js";

// shop-list
// shop-detail
import "./shop-network-warning.js";
import "./shop-404.js";

// shop-cart
import "./shop-cart-item.js";

// shop-checkout
import "@polymer/paper-spinner/paper-spinner-lite.js";

import { store } from '../store.js';
import { installCart } from '../cart.js';
import cart from '../reducers/cart.js';

store.addReducers({
  cart
});
installCart(store);
