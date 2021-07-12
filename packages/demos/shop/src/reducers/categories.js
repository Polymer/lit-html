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
  RECEIVE_CATEGORIES,
  RECEIVE_CATEGORY_ITEMS,
  FAIL_CATEGORY_ITEMS,
  REQUEST_CATEGORY_ITEMS
} from '../actions/categories.js';
import { createSelector } from 'reselect';

const categories = (state = {}, action) => {
  switch (action.type) {
    case RECEIVE_CATEGORIES:
      return {
        ...state,
        ...action.categories
      };
    case REQUEST_CATEGORY_ITEMS:
    case RECEIVE_CATEGORY_ITEMS:
    case FAIL_CATEGORY_ITEMS:
      const categoryId = action.categoryId;
      return {
        ...state,
        [categoryId]: category(state[categoryId], action)
      };
    default:
      return state;
  }
}

const category = (state = {}, action) => {
  switch (action.type) {
    case REQUEST_CATEGORY_ITEMS:
      return {
        ...state,
        failure: false,
        isFetching: true
      };
    case RECEIVE_CATEGORY_ITEMS:
      return {
        ...state,
        failure: false,
        isFetching: false,
        items: {
          ...action.items.reduce((obj, item) => {
            obj[item.name] = item;
            return obj;
          }, {})
        }
      };
    case FAIL_CATEGORY_ITEMS:
      return {
        ...state,
        failure: true,
        isFetching: false
      };
    default:
      return state;
  }
}

export default categories;

const categoriesSelector = state => state.categories;

const categoryNameSelector = state => state.app.categoryName;

export const currentCategorySelector = createSelector(
  categoriesSelector,
  categoryNameSelector,
  (categories, categoryName) => (categories && categoryName ? categories[categoryName]: null)
);

const itemNameSelector = state => state.app.itemName;

export const currentItemSelector = createSelector(
  currentCategorySelector,
  itemNameSelector,
  (category, itemName) => (category && category.items && itemName ? category.items[itemName] : null)
);
