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

export const shopSelectStyle = html` <style>
  shop-select {
    display: inline-block;
    position: relative;
    /* create a layer to avoid invalidation from other controls*/
    -webkit-transform: translateZ(0);
    transform: translateZ(0);
  }

  shop-select > shop-md-decorator {
    display: block;
    border-top: 1px solid #ccc;
    height: 1px;
    speak: none;
  }

  shop-select > shop-md-decorator::after {
    content: '\\25BC';
    display: block;
    position: absolute;
    bottom: calc(50% - 0.75em);
    right: 8px;
    speak: none;
    -webkit-transform: scaleY(0.6);
    transform: scaleY(0.6);
    color: var(--app-secondary-color);
    pointer-events: none;
  }

  shop-select > select {
    width: 100%;
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    padding: 8px 24px 8px 0;
    border: none;
    background-color: transparent;
    border-radius: 0;
    font-size: 1em;
    font-weight: 300;
    color: var(--app-primary-color);
    overflow: hidden;
    margin: 0;
    outline: none;
  }

  shop-select > select::-ms-expand {
    display: none;
  }

  shop-select > shop-md-decorator > shop-underline {
    display: block;
    background-color: var(--app-accent-color);
    height: 2px;
    position: relative;
    top: -1px;
    width: 100%;
    margin: auto;
    -webkit-transform: scale3d(0, 1, 1);
    transform: scale3d(0, 1, 1);
    transition: -webkit-transform 0.2s ease-in;
    transition: transform 0.2s ease-in;
  }

  shop-select > select:focus + shop-md-decorator > shop-underline {
    -webkit-transform: scale3d(1, 1, 1);
    transform: scale3d(1, 1, 1);
    transition: -webkit-transform 0.2s ease-out;
    transition: transform 0.2s ease-out;
  }

  shop-select > select:focus + shop-md-decorator::before,
  shop-select > select:focus + shop-md-decorator::after,
  shop-select > select:focus {
    color: black;
  }

  /* hide the focus ring in firefox */
  shop-select > select:focus:-moz-focusring {
    color: transparent;
    text-shadow: 0 0 0 #000;
  }

  shop-select > [prefix] {
    position: absolute;
    left: 0px;
    top: calc(50% - 8px);
    line-height: 16px;
    color: var(--app-secondary-color);
    pointer-events: none;
  }
</style>`;
