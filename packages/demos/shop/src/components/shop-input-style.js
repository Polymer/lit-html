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

export const shopInputStyle = html` <style>
  shop-input {
    display: inline-block;
    margin: 20px 0;
  }

  shop-input > input::-webkit-input-placeholder {
    color: transparent;
  }

  shop-input > input::-moz-placeholder {
    color: transparent;
  }

  shop-input > input:-ms-input-placeholder {
    color: transparent;
  }

  shop-input > input::-ms-input-placeholder {
    color: transparent;
  }

  shop-input > input {
    font-size: 1em;
    font-weight: 300;
    color: var(--app-primary-color);
    border: none;
    padding: 8px 0;
    width: 100%;
    outline: none;
  }

  shop-input > input:invalid {
    /* reset the default style in FF */
    box-shadow: none;
  }

  shop-input > shop-md-decorator {
    display: block;
    height: 1px;
    width: 100%;
    margin: auto;
    border-top: 1px solid #ccc;
    position: relative;
    -webkit-transform: translateZ(0);
    transform: translateZ(0);
  }

  shop-input shop-underline {
    display: block;
    height: 2px;
    width: 100%;
    margin: auto;
    background-color: var(--app-accent-color);
    position: absolute;
    top: -1px;
    left: 0;
    -webkit-transform: scale3d(0, 1, 1);
    transform: scale3d(0, 1, 1);
    transition: -webkit-transform 0.2s ease-in;
    transition: transform 0.2s ease-in;
  }

  /* input label */
  shop-input > shop-md-decorator > label {
    display: block;
    pointer-events: none;
    opacity: 0.5;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
    -webkit-transform-origin: 0 0;
    transform-origin: 0 0;
    transition-property: opacity, -webkit-transform;
    transition-property: opacity, transform;
    transition-duration: 0.15s;
    transition-timing-function: ease-out;
    will-change: transform;
    -webkit-transform: translate3d(0px, -1.9em, 0px);
    transform: translate3d(0px, -1.9em, 0px);
  }

  /* Error message */
  shop-input > shop-md-decorator::after {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    font-size: 0.65em;
    color: #dd2c00;
    content: attr(error-message);
    display: none;
    white-space: nowrap;
  }

  shop-input > input:focus + shop-md-decorator > shop-underline {
    -webkit-transform: scale3d(1, 1, 1);
    transform: scale3d(1, 1, 1);
    transition: -webkit-transform 0.2s ease-out;
    transition: transform 0.2s ease-out;
  }

  /* Label: valid state */
  shop-input > input:focus + shop-md-decorator > label {
    -webkit-transform: translate3d(0px, -3.4em, 0px) scale(0.8, 0.8);
    transform: translate3d(0px, -3.4em, 0px) scale(0.8, 0.8);
    opacity: 1;
  }

  shop-input
    > input:optional:not(:placeholder-shown)
    + shop-md-decorator
    > label {
    -webkit-transform: translate3d(0px, -3.4em, 0px) scale(0.8, 0.8);
    transform: translate3d(0px, -3.4em, 0px) scale(0.8, 0.8);
    opacity: 1;
  }

  _:-ms-lang(x),
  shop-input > input + shop-md-decorator > label {
    -webkit-transform: translate3d(0px, -3.4em, 0px) scale(0.8, 0.8);
    transform: translate3d(0px, -3.4em, 0px) scale(0.8, 0.8);
    opacity: 1;
  }

  shop-input > input:optional:-moz-ui-valid + shop-md-decorator > label {
    -webkit-transform: translate3d(0px, -3.4em, 0px) scale(0.8, 0.8);
    transform: translate3d(0px, -3.4em, 0px) scale(0.8, 0.8);
    opacity: 1;
  }

  /* Underline */
  shop-input
    > input:not(:focus):not(:placeholder-shown):invalid
    + shop-md-decorator
    > shop-underline {
    background-color: #dd2c00;
    -webkit-transform: scale3d(1, 1, 1);
    transform: scale3d(1, 1, 1);
    transition: -webkit-transform 0.2s ease-out;
    transition: transform 0.2s ease-out;
  }

  shop-input
    > input:not(:focus):-moz-ui-invalid:invalid
    + shop-md-decorator
    > shop-underline {
    background-color: #dd2c00;
    -webkit-transform: scale3d(1, 1, 1);
    transform: scale3d(1, 1, 1);
    transition: -webkit-transform 0.2s ease-out;
    transition: transform 0.2s ease-out;
  }

  shop-input
    > input[aria-invalid='true']:not(:valid)
    + shop-md-decorator
    > shop-underline {
    background-color: #dd2c00;
    -webkit-transform: scale3d(1, 1, 1);
    transform: scale3d(1, 1, 1);
    transition: -webkit-transform 0.2s ease-out;
    transition: transform 0.2s ease-out;
  }

  /* Error message */
  shop-input
    > input:not(:focus):not(:placeholder-shown):invalid
    + shop-md-decorator::after {
    display: block;
  }

  shop-input
    > input:not(:focus):-moz-ui-invalid:invalid
    + shop-md-decorator::after {
    display: block;
  }

  shop-input
    > input[aria-invalid='true']:not(:valid)
    + shop-md-decorator::after {
    display: block;
  }

  /* Error label */
  shop-input
    > input:not(:focus):not(:placeholder-shown):invalid
    + shop-md-decorator
    > label {
    -webkit-transform: translate3d(0px, -3.4em, 0px) scale(0.8, 0.8);
    transform: translate3d(0px, -3.4em, 0px) scale(0.8, 0.8);
    opacity: 1;
    color: #dd2c00;
  }

  shop-input
    > input:not(:focus):-moz-ui-invalid:invalid
    + shop-md-decorator
    > label {
    -webkit-transform: translate3d(0px, -3.4em, 0px) scale(0.8, 0.8);
    transform: translate3d(0px, -3.4em, 0px) scale(0.8, 0.8);
    opacity: 1;
    color: #dd2c00;
  }

  shop-input
    > input[aria-invalid='true']:not(:valid)
    + shop-md-decorator
    > label {
    -webkit-transform: translate3d(0px, -3.4em, 0px) scale(0.8, 0.8);
    transform: translate3d(0px, -3.4em, 0px) scale(0.8, 0.8);
    opacity: 1;
    color: #dd2c00;
  }

  /* Valid label */
  shop-input > input:not(:focus):required:valid + shop-md-decorator > label {
    -webkit-transform: translate3d(0px, -3.4em, 0px) scale(0.8, 0.8);
    transform: translate3d(0px, -3.4em, 0px) scale(0.8, 0.8);
    opacity: 1;
  }
</style>`;
