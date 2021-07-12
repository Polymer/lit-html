/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

import { UPDATE_CHECKOUT_STATE } from '../actions/checkout.js';
import { UPDATE_LOCATION } from '../actions/app.js';

const checkout = (state = {}, action) => {
  switch (action.type) {
    // Any navigation should reset the checkout form.
    case UPDATE_LOCATION:
      return {
        ...state,
        state: 'init'
      };
    case UPDATE_CHECKOUT_STATE:
      return {
        ...state,
        state: action.state
      };
    default:
      return state;
  }
}

export default checkout;
