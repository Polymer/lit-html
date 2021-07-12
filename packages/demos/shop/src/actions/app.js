/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

import { fetchCategoryItemsIfNeeded, fetchCategoriesIfNeeded } from './categories.js';
import { currentCategorySelector, currentItemSelector } from '../reducers/categories.js';

export const UPDATE_LOCATION = 'UPDATE_LOCATION';
export const RECEIVE_LAZY_RESOURCES = 'RECEIVE_LAZY_RESOURCES';
export const SET_ANNOUNCER_LABEL = 'SET_ANNOUNCER_LABEL';
export const CLEAR_ANNOUNCER_LABEL = 'CLEAR_ANNOUNCER_LABEL';
export const CLOSE_MODAL = 'CLOSE_MODAL';
export const UPDATE_NETWORK_STATUS = 'UPDATE_NETWORK_STATUS';
export const CLOSE_SNACKBAR = 'CLOSE_SNACKBAR';
export const UPDATE_DRAWER_STATE = 'UPDATE_DRAWER_STATE';

export const reloadCategory = () => async (dispatch, getState) => {
  let state = getState();
  const page = state.app.page;
  if (['list', 'detail'].indexOf(page) === -1) {
    return;
  }

  let category = currentCategorySelector(state);
  if (category) {
    await dispatch(fetchCategoryItemsIfNeeded(category));
    state = getState();
    category = currentCategorySelector(state);
    switch (page) {
      case 'list':
        dispatch(announceLabel(`${category.title}, loaded`));
        return;
      case 'detail':
        const item = currentItemSelector(state);
        if (item) {
          dispatch(announceLabel(`${item.title}, loaded`));
          return;
        }
        break;
    }
  }

  dispatch(announceLabel(`Page not found`));
  dispatch({
    type: UPDATE_LOCATION,
    page: '404',
  });
};

export const updateLocation = (location) => async (dispatch, getState) => {
  const path = window.decodeURIComponent(location.pathname);
  const splitPath = (path || '').slice(1).split('/');
  let page = splitPath[0];
  let categoryName = null;
  let itemName = null;
  await dispatch(fetchCategoriesIfNeeded());
  switch (page) {
    case '':
      page = 'home';
      dispatch(announceLabel(`Home, loaded`));
      break;
    case 'cart':
      await import('../components/shop-cart.js');
      dispatch(announceLabel(`Cart, loaded`));
      break;
    case 'checkout':
      await import('../components/shop-checkout.js');
      dispatch(announceLabel(`Checkout, loaded`));
      break;
    case 'list':
      categoryName = splitPath[1];
      await import('../components/shop-list.js');
      break;
    case 'detail':
      categoryName = splitPath[1];
      itemName = splitPath[2];
      await import('../components/shop-detail.js');
      break;
    default:
      page = '404';
      dispatch(announceLabel(`Page not found`));
  }

  dispatch({
    type: UPDATE_LOCATION,
    page,
    categoryName,
    itemName
  });

  await dispatch(reloadCategory());

  const lazyLoadComplete = getState().app.lazyResourcesLoaded;
  // load lazy resources after render and set `lazyLoadComplete` when done.
  if (!lazyLoadComplete) {
    requestAnimationFrame(async () => {
      await import('../components/lazy-resources.js');
      dispatch({
        type: RECEIVE_LAZY_RESOURCES
      });
    });
  }
};

const setAnnouncerLabel = (label) => {
  return {
    type: SET_ANNOUNCER_LABEL,
    label
  };
};

const clearAnnouncerLabel = () => {
  return {
    type: CLEAR_ANNOUNCER_LABEL
  };
};

let announcerTimer = 0;

export const announceLabel = (label) => (dispatch) => {
  dispatch(clearAnnouncerLabel());
  // Debounce announcements.
  clearTimeout(announcerTimer);
  announcerTimer = setTimeout(() => {
    dispatch(setAnnouncerLabel(label));
  }, 300);
};

export const closeModal = () => {
  return {
    type: CLOSE_MODAL
  };
};

let snackbarTimer = 0;

export const updateNetworkStatus = (offline) => (dispatch, getState) => {
  const prevOffline = getState().app.offline;
  dispatch({
    type: UPDATE_NETWORK_STATUS,
    offline
  });
  clearTimeout(snackbarTimer);
  snackbarTimer = setTimeout(() => dispatch({ type: CLOSE_SNACKBAR }), 3000);

  if (!offline && prevOffline) {
    dispatch(reloadCategory());
  }
};

export const updateDrawerState = (opened) => {
  return {
    type: UPDATE_DRAWER_STATE,
    opened
  };
};
