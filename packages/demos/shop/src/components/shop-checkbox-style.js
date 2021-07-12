/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

import {html} from 'lit';

export const shopCheckboxStyle = html` <style>
  shop-checkbox {
    display: inline-block;
    width: 14px;
    height: 14px;
    position: relative;
    border: 2px solid var(--app-accent-color);
    border-radius: 2px;
  }

  shop-checkbox > input[type='checkbox'] {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    opacity: 0;
  }

  shop-checkbox > shop-md-decorator {
    pointer-events: none;
  }

  /* Checked state overlay */
  shop-checkbox > shop-md-decorator::after {
    content: '';
    position: absolute;
    top: -5px;
    left: -5px;
    right: -5px;
    bottom: -5px;
    background-image: url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20fill%3D%22%23172C50%22%20d%3D%22M19%203H5c-1.11%200-2%20.9-2%202v14c0%201.1.89%202%202%202h14c1.11%200%202-.9%202-2V5c0-1.1-.89-2-2-2zm-9%2014l-5-5%201.41-1.41L10%2014.17l7.59-7.59L19%208l-9%209z%22%2F%3E%3C%2Fsvg%3E');
    opacity: 0;
    transition: opacity 0.1s;
    will-change: opacity;
  }

  shop-checkbox > input[type='checkbox']:checked + shop-md-decorator::after {
    opacity: 1;
  }

  /* Focused state */
  shop-checkbox > shop-md-decorator::before {
    content: '';
    pointer-events: none;
    position: absolute;
    top: -13px;
    left: -13px;
    width: 40px;
    height: 40px;
    background-color: var(--app-accent-color);
    border-radius: 50%;
    opacity: 0.2;
    -webkit-transform: scale3d(0, 0, 0);
    transform: scale3d(0, 0, 0);
    transition: -webkit-transform 0.1s;
    transition: transform 0.1s;
    will-change: transform;
  }

  shop-checkbox > input[type='checkbox']:focus + shop-md-decorator::before {
    -webkit-transform: scale3d(1, 1, 1);
    transform: scale3d(1, 1, 1);
  }
</style>`;
