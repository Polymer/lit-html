/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {queryAssignedNodes} from '../../decorators/query-assigned-nodes.js';
import {
  canTestReactiveElement,
  generateElementName,
  RenderingElement,
  html,
} from '../test-helpers.js';
import {assert} from '@esm-bundle/chai';

const extraGlobals = window as LitExtraGlobals;

const flush =
  extraGlobals.ShadyDOM && extraGlobals.ShadyDOM.flush
    ? extraGlobals.ShadyDOM.flush
    : () => {};

(canTestReactiveElement ? suite : suite.skip)('@queryAssignedNodes', () => {
  let container: HTMLElement;
  let el: C;

  class D extends RenderingElement {
    @queryAssignedNodes() defaultAssigned!: Node[];

    // The `true` on the decorator indicates that results should be flattened.
    @queryAssignedNodes('footer', true) footerAssigned!: Node[];

    @queryAssignedNodes('footer', true, '.item')
    footerAssignedItems!: Element[];

    render() {
      return html`
        <slot></slot>
        <slot name="footer"></slot>
      `;
    }
  }
  customElements.define('assigned-nodes-el', D);

  class E extends RenderingElement {
    @queryAssignedNodes() defaultAssigned!: Node[];

    @queryAssignedNodes('header') headerAssigned!: Node[];

    render() {
      return html`
        <slot name="header"></slot>
        <slot></slot>
      `;
    }
  }
  customElements.define('assigned-nodes-el-2', E);

  const defaultSymbol = Symbol('default');
  const headerSymbol = Symbol('header');
  class S extends RenderingElement {
    @queryAssignedNodes() [defaultSymbol]!: Node[];

    @queryAssignedNodes('header') [headerSymbol]!: Node[];

    render() {
      return html`
        <slot name="header"></slot>
        <slot></slot>
      `;
    }
  }
  customElements.define('assigned-nodes-el-symbol', S);

  // Note, there are 2 elements here so that the `flatten` option of
  // the decorator can be tested.
  class C extends RenderingElement {
    div!: HTMLDivElement;
    div2!: HTMLDivElement;
    div3!: HTMLDivElement;
    assignedNodesEl!: D;
    assignedNodesEl2!: E;
    assignedNodesEl3!: S;
    @queryAssignedNodes() missingSlotAssignedNodes!: Node[];

    render() {
      return html`
        <assigned-nodes-el
          ><div id="div1">A</div>
          <slot slot="footer"></slot
        ></assigned-nodes-el>
        <assigned-nodes-el-2><div id="div2">B</div></assigned-nodes-el-2>
        <assigned-nodes-el-symbol
          ><div id="div3">B</div></assigned-nodes-el-symbol
        >
      `;
    }

    firstUpdated() {
      this.div = this.renderRoot.querySelector('#div1') as HTMLDivElement;
      this.div2 = this.renderRoot.querySelector('#div2') as HTMLDivElement;
      this.div3 = this.renderRoot.querySelector('#div3') as HTMLDivElement;
      this.assignedNodesEl = this.renderRoot.querySelector(
        'assigned-nodes-el'
      ) as D;
      this.assignedNodesEl2 = this.renderRoot.querySelector(
        'assigned-nodes-el-2'
      ) as E;
      this.assignedNodesEl3 = this.renderRoot.querySelector(
        'assigned-nodes-el-symbol'
      ) as S;
    }
  }
  customElements.define(generateElementName(), C);

  setup(async () => {
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
    el = new C();
    container.appendChild(el);
    await el.updateComplete;
    await el.assignedNodesEl.updateComplete;
  });

  teardown(() => {
    if (container !== undefined) {
      container.parentElement!.removeChild(container);
      (container as any) = undefined;
    }
  });

  test('returns assignedNodes for slot', () => {
    // Note, `defaultAssigned` does not `flatten` so we test that the property
    // reflects current state and state when nodes are added or removed.
    assert.deepEqual(el.assignedNodesEl.defaultAssigned, [
      el.div,
      el.div.nextSibling!,
    ]);
    const child = document.createElement('div');
    const text1 = document.createTextNode('');
    el.assignedNodesEl.appendChild(text1);
    el.assignedNodesEl.appendChild(child);
    const text2 = document.createTextNode('');
    el.assignedNodesEl.appendChild(text2);
    flush();
    assert.deepEqual(el.assignedNodesEl.defaultAssigned, [
      el.div,
      el.div.nextSibling!,
      text1,
      child,
      text2,
    ]);
    el.assignedNodesEl.removeChild(child);
    flush();
    assert.deepEqual(el.assignedNodesEl.defaultAssigned, [
      el.div,
      el.div.nextSibling!,
      text1,
      text2,
    ]);
  });

  test('returns assignedNodes for unnamed slot that is not first slot', () => {
    assert.deepEqual(el.assignedNodesEl2.defaultAssigned, [el.div2]);
  });

  test('returns assignedNodes for unnamed slot via symbol property', () => {
    assert.deepEqual(el.assignedNodesEl3[defaultSymbol], [el.div3]);
  });

  test('returns flattened assignedNodes for slot', () => {
    // Note, `defaultAssigned` does `flatten` so we test that the property
    // reflects current state and state when nodes are added or removed to
    // the light DOM of the element containing the element under test.
    assert.deepEqual(el.assignedNodesEl.footerAssigned, []);
    const child1 = document.createElement('div');
    const child2 = document.createElement('div');
    el.appendChild(child1);
    el.appendChild(child2);
    flush();
    assert.deepEqual(el.assignedNodesEl.footerAssigned, [child1, child2]);
    el.removeChild(child2);
    flush();
    assert.deepEqual(el.assignedNodesEl.footerAssigned, [child1]);
  });

  test('returns assignedNodes for slot filtered by selector', () => {
    // Note, `defaultAssigned` does `flatten` so we test that the property
    // reflects current state and state when nodes are added or removed to
    // the light DOM of the element containing the element under test.
    assert.deepEqual(el.assignedNodesEl.footerAssignedItems, []);
    const child1 = document.createElement('div');
    const child2 = document.createElement('div');
    child2.classList.add('item');
    el.appendChild(child1);
    el.appendChild(child2);
    flush();
    assert.deepEqual(el.assignedNodesEl.footerAssignedItems, [child2]);
    el.removeChild(child2);
    flush();
    assert.deepEqual(el.assignedNodesEl.footerAssignedItems, []);
  });

  test('returns assignedNodes for slot that contains text nodes filtered by selector when Element.matches does not exist', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      Element.prototype,
      'matches'
    );
    Object.defineProperty(Element.prototype, 'matches', {
      value: undefined,
      configurable: true,
    });
    assert.deepEqual(el.assignedNodesEl.footerAssignedItems, []);
    const child1 = document.createElement('div');
    const child2 = document.createElement('div');
    const text1 = document.createTextNode('');
    const text2 = document.createTextNode('');
    child2.classList.add('item');
    el.appendChild(child1);
    el.appendChild(text1);
    el.appendChild(child2);
    el.appendChild(text2);
    flush();
    assert.deepEqual(el.assignedNodesEl.footerAssignedItems, [child2]);
    el.removeChild(child2);
    flush();
    assert.deepEqual(el.assignedNodesEl.footerAssignedItems, []);
    if (descriptor !== undefined) {
      Object.defineProperty(Element.prototype, 'matches', descriptor);
    }
  });

  test('always returns an array, even if the slot is not rendered', () => {
    assert.isArray(el.missingSlotAssignedNodes);
  });
});
