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

export const shopFormStyle = html` <style>
  :host {
    display: block;
  }

  .main-frame {
    margin: 0 auto;
    padding: 0 24px 48px 24px;
    max-width: 900px;
    overflow: hidden;
  }

  .empty-cart {
    text-align: center;
    white-space: nowrap;
    color: var(--app-secondary-color);
  }

  h2 {
    font-size: 13px;
  }
</style>`;
