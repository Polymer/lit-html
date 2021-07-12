/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

import { announceLabel } from './app.js';

export const SET_CART = 'SET_CART';
export const ADD_TO_CART = 'ADD_TO_CART';
export const EDIT_CART = 'EDIT_CART';
export const REMOVE_FROM_CART = 'REMOVE_FROM_CART';
export const CLEAR_CART = 'CLEAR_CART';

export const setCart = (cart) => {
  return {
    type: SET_CART,
    cart
  };
};

export const addToCart = (entry) => (dispatch) => {
  dispatch({
    type: ADD_TO_CART,
    entryId: getEntryId(entry),
    entry
  });
  dispatch(announceLabel('Item added to your cart'));
};

export const editCart = (entry) => (dispatch) => {
  dispatch({
    type: EDIT_CART,
    entryId: getEntryId(entry),
    entry
  });
  dispatch(announceLabel(`Quantity changed to ${entry.quantity}`));
};

export const removeFromCart = (entry) => (dispatch) => {
  dispatch({
    type: REMOVE_FROM_CART,
    entryId: getEntryId(entry),
    entry
  });
  dispatch(announceLabel(`Item removed from your cart`));
};

export const clearCart = () => {
  return {
    type: CLEAR_CART
  };
};

function getEntryId(entry) {
  return `${entry.item.category}_$$$_${entry.item.name}_$$$_${entry.size}`;
}
