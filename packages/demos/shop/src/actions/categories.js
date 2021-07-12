/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

export const RECEIVE_CATEGORIES = 'RECEIVE_CATEGORIES';
export const REQUEST_CATEGORY_ITEMS = 'REQUEST_CATEGORY_ITEMS';
export const RECEIVE_CATEGORY_ITEMS = 'RECEIVE_CATEGORY_ITEMS';
export const FAIL_CATEGORY_ITEMS = 'FAIL_CATEGORY_ITEMS';

const INITIAL_CATEGORIES = {
  'mens_outerwear': {
    name: 'mens_outerwear',
    title: 'Men\'s Outerwear',
    image: 'images/mens_outerwear.jpg',
    placeholder: 'data:image/jpeg;base64,/9j/4QAYRXhpZgAASUkqAAgAAAAAAAAAAAAAAP/sABFEdWNreQABAAQAAAAeAAD/7gAOQWRvYmUAZMAAAAAB/9sAhAAQCwsLDAsQDAwQFw8NDxcbFBAQFBsfFxcXFxcfHhcaGhoaFx4eIyUnJSMeLy8zMy8vQEBAQEBAQEBAQEBAQEBAAREPDxETERUSEhUUERQRFBoUFhYUGiYaGhwaGiYwIx4eHh4jMCsuJycnLis1NTAwNTVAQD9AQEBAQEBAQEBAQED/wAARCAADAA4DASIAAhEBAxEB/8QAXAABAQEAAAAAAAAAAAAAAAAAAAIEAQEAAAAAAAAAAAAAAAAAAAACEAAAAwYHAQAAAAAAAAAAAAAAERMBAhIyYhQhkaEDIwUVNREBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8A3dkr5e8tfpwuneJITOzIcmQpit037Bw4mnCVNOpAAQv/2Q=='
  },
  'ladies_outerwear': {
    name: 'ladies_outerwear',
    title: 'Ladies Outerwear',
    image: 'images/ladies_outerwear.jpg',
    placeholder: 'data:image/jpeg;base64,/9j/4QAYRXhpZgAASUkqAAgAAAAAAAAAAAAAAP/sABFEdWNreQABAAQAAAAeAAD/7gAOQWRvYmUAZMAAAAAB/9sAhAAQCwsLDAsQDAwQFw8NDxcbFBAQFBsfFxcXFxcfHhcaGhoaFx4eIyUnJSMeLy8zMy8vQEBAQEBAQEBAQEBAQEBAAREPDxETERUSEhUUERQRFBoUFhYUGiYaGhwaGiYwIx4eHh4jMCsuJycnLis1NTAwNTVAQD9AQEBAQEBAQEBAQED/wAARCAADAA4DASIAAhEBAxEB/8QAWQABAQAAAAAAAAAAAAAAAAAAAAEBAQEAAAAAAAAAAAAAAAAAAAIDEAABAwMFAQAAAAAAAAAAAAARAAEygRIDIlITMwUVEQEBAAAAAAAAAAAAAAAAAAAAQf/aAAwDAQACEQMRAD8Avqn5meQ0kwk1UyclmLtNj7L4PQoioFf/2Q=='
  },
  'mens_tshirts': {
    name: 'mens_tshirts',
    title: 'Men\'s T-Shirts',
    image: 'images/mens_tshirts.jpg',
    placeholder: 'data:image/jpeg;base64,/9j/4QAYRXhpZgAASUkqAAgAAAAAAAAAAAAAAP/sABFEdWNreQABAAQAAAAeAAD/7gAOQWRvYmUAZMAAAAAB/9sAhAAQCwsLDAsQDAwQFw8NDxcbFBAQFBsfFxcXFxcfHhcaGhoaFx4eIyUnJSMeLy8zMy8vQEBAQEBAQEBAQEBAQEBAAREPDxETERUSEhUUERQRFBoUFhYUGiYaGhwaGiYwIx4eHh4jMCsuJycnLis1NTAwNTVAQD9AQEBAQEBAQEBAQED/wAARCAADAA4DASIAAhEBAxEB/8QAWwABAQEAAAAAAAAAAAAAAAAAAAMEAQEAAAAAAAAAAAAAAAAAAAAAEAABAwEJAAAAAAAAAAAAAAARAAESEyFhodEygjMUBREAAwAAAAAAAAAAAAAAAAAAAEFC/9oADAMBAAIRAxEAPwDb7kupZU1MTGnvOCgxpvzEXTyRElCmf//Z'
  },
  'ladies_tshirts': {
    name: 'ladies_tshirts',
    title: 'Ladies T-Shirts',
    image: 'images/ladies_tshirts.jpg',
    placeholder: 'data:image/jpeg;base64,/9j/4QAYRXhpZgAASUkqAAgAAAAAAAAAAAAAAP/sABFEdWNreQABAAQAAAAeAAD/7gAOQWRvYmUAZMAAAAAB/9sAhAAQCwsLDAsQDAwQFw8NDxcbFBAQFBsfFxcXFxcfHhcaGhoaFx4eIyUnJSMeLy8zMy8vQEBAQEBAQEBAQEBAQEBAAREPDxETERUSEhUUERQRFBoUFhYUGiYaGhwaGiYwIx4eHh4jMCsuJycnLis1NTAwNTVAQD9AQEBAQEBAQEBAQED/wAARCAADAA4DASIAAhEBAxEB/8QAXwABAQEAAAAAAAAAAAAAAAAAAAMFAQEBAAAAAAAAAAAAAAAAAAABAhAAAQIDCQAAAAAAAAAAAAAAEQABITETYZECEjJCAzMVEQACAwAAAAAAAAAAAAAAAAAAATFBgf/aAAwDAQACEQMRAD8AzeADAZiFc5J7BC9Scek3VrtooilSNaf/2Q=='
  }
};

export const fetchCategoriesIfNeeded = () => (dispatch, getState) => {
  // This can be dispatched async if needed (e.g. after a fetch() request).
  return new Promise((resolve) => {
    const categories = getState().categories;
    if (Object.keys(categories).length) {
      resolve();
    } else {
      dispatch({
        type: RECEIVE_CATEGORIES,
        categories: INITIAL_CATEGORIES
      });
      resolve();
    }
  });
};

export const fetchCategoryItemsIfNeeded = (category) => (dispatch, getState) => {
  if (category && category.name && !category.items && !category.isFetching) {
    dispatch(requestCategoryItems(category.name));
    return fetch(`data/${category.name}.json`)
      .then(res => res.json())
      .then(items => dispatch(receiveCategoryItems(category.name, items)))
      .catch(() => dispatch(failCategoryItems(category.name)));
  } else {
    return Promise.resolve();
  }
};

const requestCategoryItems = (categoryId) => {
  return {
    type: REQUEST_CATEGORY_ITEMS,
    categoryId
  };
};

const receiveCategoryItems = (categoryId, items) => {
  return {
    type: RECEIVE_CATEGORY_ITEMS,
    categoryId,
    items
  };
};

const failCategoryItems = (categoryId) => {
  return {
    type: FAIL_CATEGORY_ITEMS,
    categoryId
  };
};
