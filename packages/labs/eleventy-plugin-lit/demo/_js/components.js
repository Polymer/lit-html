/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import 'lit/experimental-hydrate-support.js';
import {LitElement, html, css} from 'lit';

export class CalcWC extends LitElement {
  static styles = css`
    :host {
      display: inline-block;
      margin: 5px;
      border: 1px solid gray;
      width: 120px;
    }

    .row {
      display: flex;
    }

    .top {
      flex-direction: column;
    }

    .input {
      flex: 1;
      max-width: 100%;
      height: 30px;
      box-sizing: border-box;
      border: 0px;
      text-align: right;
      font-size: 2em;
      color: gray;
    }

    .clear {
      margin-left: auto;
      background: transparent;
      border: 0;
      color: gray;
      padding: 5px;
    }

    .digit,
    .operation {
      flex: 1;
      height: 30px;
      border: 0;
      background: gray;
      color: white;
      transition: background 0.2s;
    }

    .digit:active,
    .operation:active {
      background: teal;
    }

    .operation {
      background: black;
    }
  `;

  static properties = {
    value: {type: Number},
  };

  constructor() {
    super();
    this.value = 0;
  }

  operations = [];

  render() {
    const disableClear = this.value == '0';
    return html`
      <div @click=${this.handleClick}>
        <div class="top row">
          <input value=${this.value} class="input" />
          <button class="clear" ?disabled=${disableClear}>clear</button>
        </div>
        <div class="row">
          <button class="digit">7</button>
          <button class="digit">8</button>
          <button class="digit">9</button>
          <button class="operation">÷</button>
        </div>
        <div class="row">
          <button class="digit">4</button>
          <button class="digit">5</button>
          <button class="digit">6</button>
          <button class="operation">×</button>
        </div>
        <div class="row">
          <button class="digit">1</button>
          <button class="digit">2</button>
          <button class="digit">3</button>
          <button class="operation">-</button>
        </div>
        <div class="row">
          <button class="digit">.</button>
          <button class="digit">0</button>
          <button class="digit">=</button>
          <button class="operation">+</button>
        </div>
      </div>
    `;
  }

  handleClick(e) {
    const value = e.target.textContent || 'error';
    if (!isNaN(Number(value))) {
      this.value = `${this.value === '0' ? '' : this.value}${value}`;
    } else if (value === '.') {
      if (this.value[this.value.length - 1] !== '.') {
        this.value = `${this.value}${value}`;
      }
    } else if (value === 'clear') {
      this.value = '0';
      this.operations = [];
    } else if (value === '=') {
      this.operations.push(this.value);
      this.value = this.equate();
      this.operations = [];
    } else {
      this.operations.push(this.value, value);
      this.value = '';
    }
  }

  equate() {
    const toSum = [];
    let value = Number(this.operations.shift());
    while (this.operations.length) {
      const op = this.operations.shift();
      const v = Number(this.operations.shift());
      if (op === '×') {
        value *= v;
      } else if (op === '÷') {
        value /= v;
      } else if (op === '+') {
        toSum.push(value);
        value = v;
      } else {
        toSum.push(value);
        value = -v;
      }
    }
    return String(toSum.reduce((p, n) => p + n, value));
  }
}
customElements.define('calc-wc', CalcWC);
