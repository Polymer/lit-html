/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

import {LitElement, html} from 'lit';
import {flush} from '@polymer/polymer/lib/legacy/polymer.dom.js';
import {microTask, timeOut} from '@polymer/polymer/lib/utils/async.js';

class ShopTabsOverlay extends LitElement {
  render() {
    return html` <style>
      :host {
        position: absolute;
        display: none;
        pointer-events: none;
        opacity: 0;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        transition-property: top, right, bottom, left, opacity;
      }
    </style>`;
  }

  static get properties() {
    return {
      /**
       * The element the overlay should cover.
       */
      target: {type: Object},
    };
  }

  constructor() {
    super();
    this._lastTarget = undefined;
    this._transitionsInFlight = [];
  }

  firstUpdated() {
    this.addEventListener('transitionend', (e) => this._onTransitionend(e));
  }

  updated(changedProps) {
    if (changedProps.has('target')) {
      this._targetChanged(this.target, changedProps.get('target'));
    }
  }

  _targetChanged(newTarget, oldTarget) {
    if (!this._transitionsInFlight.length) {
      if (this._lastTarget) {
        this._lastTarget.classList.remove('shop-tabs-overlay-static-above');
      }
      this.style.display = 'block';
      this._move(oldTarget, newTarget);
      this._lastTarget = this.target;
    }
  }

  _onTransitionend(event) {
    let index = this._transitionsInFlight.indexOf(event.propertyName);
    if (index >= 0) {
      this._transitionsInFlight.splice(index, 1);
    }

    if (!this._transitionsInFlight.length) {
      this._moveComplete();
    }
  }

  _moveComplete() {
    if (this._lastTarget !== this.target) {
      this._move(this._lastTarget, this.target);
      this._lastTarget = this.target;
    } else {
      if (this._lastTarget) {
        this._lastTarget.classList.add('shop-tabs-overlay-static-above');
      }
      this.style.display = 'none';
    }
  }

  _move(oldTarget, newTarget) {
    let from = oldTarget || newTarget;
    let to = newTarget || oldTarget;
    if (!from && !to) return;

    let fromOpacity = oldTarget ? 1 : 0;
    let toOpacity = newTarget ? 1 : 0;

    flush();
    let thisRect = this.getBoundingClientRect();
    let thisStyle = window.getComputedStyle(this);
    let fromRect = from.getBoundingClientRect();
    let toRect = to.getBoundingClientRect();

    if (
      toRect.top === 0 &&
      toRect.right === 0 &&
      toRect.bottom === 0 &&
      toRect.left === 0 &&
      toRect.width === 0 &&
      toRect.height === 0
    ) {
      this.style.transitionProperty = 'none';
      this.style.opacity = toOpacity;
      this._transitionsInFlight = [];
      microTask.run(this._moveComplete.bind(this));
      return;
    } else {
      this.style.transitionProperty = '';
    }

    let top = parseFloat(thisStyle.top || '0') + (fromRect.top - thisRect.top);
    let right =
      parseFloat(thisStyle.right || '0') - (fromRect.right - thisRect.right);
    let bottom =
      parseFloat(thisStyle.bottom || '0') - (fromRect.bottom - thisRect.bottom);
    let left =
      parseFloat(thisStyle.left || '0') + (fromRect.left - thisRect.left);

    this.style.transitionDuration = '0s';
    this.style.transitionDelay = '0s';
    let startValues = [
      (this.style.top = top + 'px'),
      (this.style.right = right + 'px'),
      (this.style.bottom = bottom + 'px'),
      (this.style.left = left + 'px'),
      (this.style.opacity = String(fromOpacity)),
    ];

    top += toRect.top - fromRect.top;
    right -= toRect.right - fromRect.right;
    bottom -= toRect.bottom - fromRect.bottom;
    left += toRect.left - fromRect.left;

    let durations = [0.2, 0.2, 0.2, 0.2, 0.2];
    let delays = [0, 0, 0, 0, 0];
    // Delay left / right transitions if element is left / right of the target.
    if (fromRect.left < toRect.left && fromRect.right < toRect.right) {
      delays[3] = 0.1;
    } else if (fromRect.left > toRect.left && fromRect.right > toRect.right) {
      delays[1] = 0.1;
    }

    // Delay top / bottom transitions if element is above / below the target.
    if (fromRect.top < toRect.top && fromRect.bottom < toRect.bottom) {
      delays[0] = 0.1;
    } else if (fromRect.top > toRect.top && fromRect.bottom > toRect.bottom) {
      delays[2] = 0.1;
    }

    let endValues = [
      top + 'px',
      right + 'px',
      bottom + 'px',
      left + 'px',
      String(toOpacity),
    ];

    let names = ['top', 'right', 'bottom', 'left', 'opacity'];
    for (let i = 0; i < startValues.length; i++) {
      if (startValues[i] === endValues[i]) continue;
      if (durations[i] === 0 && delays[i] === 0) continue;
      this._transitionsInFlight.push(names[i]);
    }

    timeOut.run(() => {
      this.style.transitionDuration = durations
        .map((x) => {
          return x + 's';
        })
        .join(', ');
      this.style.transitionDelay = delays
        .map((x) => {
          return x + 's';
        })
        .join(', ');
      this.style.top = top + 'px';
      this.style.right = right + 'px';
      this.style.bottom = bottom + 'px';
      this.style.left = left + 'px';
      this.style.opacity = String(toOpacity);
    }, 1);
  }
}

customElements.define('shop-tabs-overlay', ShopTabsOverlay);
