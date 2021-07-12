/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

import {
  UPDATE_LOCATION,
  RECEIVE_LAZY_RESOURCES,
  CLEAR_ANNOUNCER_LABEL,
  SET_ANNOUNCER_LABEL,
  CLOSE_MODAL,
  UPDATE_NETWORK_STATUS,
  CLOSE_SNACKBAR,
  UPDATE_DRAWER_STATE
} from '../actions/app.js';
import { ADD_TO_CART } from '../actions/cart.js';
import { currentCategorySelector, currentItemSelector } from './categories.js';
import { createSelector } from 'reselect';

const app = (state = {}, action) => {
  switch (action.type) {
    case UPDATE_LOCATION:
      return {
        ...state,
        page: action.page,
        categoryName: action.categoryName,
        itemName: action.itemName,
        drawerOpened: false
      };
    case RECEIVE_LAZY_RESOURCES:
      return {
        ...state,
        lazyResourcesLoaded: true
      };
    case CLEAR_ANNOUNCER_LABEL:
      return {
        ...state,
        announcerLabel: ''
      };
    case SET_ANNOUNCER_LABEL:
      return {
        ...state,
        announcerLabel: action.label
      };
    case ADD_TO_CART:
      return {
        ...state,
        cartModalOpened: true
      };
    case CLOSE_MODAL:
      return {
        ...state,
        cartModalOpened: false
      };
    case UPDATE_NETWORK_STATUS:
      return {
        ...state,
        offline: action.offline,
        // Don't show the snackbar on the first load of the page if online.
        snackbarOpened: action.offline || (state.offline !== undefined)
      };
    case CLOSE_SNACKBAR:
      return {
        ...state,
        snackbarOpened: false
      };
    case UPDATE_DRAWER_STATE:
      return {
        ...state,
        drawerOpened: action.opened
      };
    default:
      return state;
  }
}

export default app;

const pageSelector = state => state.app.page;

export const metaSelector = createSelector(
  pageSelector,
  currentCategorySelector,
  currentItemSelector,
  (page, category, item) => {
    switch (page) {
      case 'home':
        return { title: 'Home' };
      case 'list':
        return category ? {
          title: category.title,
          image: document.baseURI + category.image
        } : null;
      case 'detail':
        return item && item.title ? {
          title: item.title,
          description: item.description.substring(0, 100),
          image: document.baseURI + item.image
        } : null;
        break;
      case 'cart':
        return { title: 'Cart' };
      case 'checkout':
        return { title: 'Checkout' };
      default:
        return { title: '404' };
    }
  }
);
