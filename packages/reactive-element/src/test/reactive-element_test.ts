/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  ComplexAttributeConverter,
  defaultConverter,
  PropertyDeclaration,
  PropertyDeclarations,
  PropertyValues,
  ReactiveElement,
} from '../reactive-element.js';
import {generateElementName, nextFrame} from './test-helpers.js';
import {assert} from '@esm-bundle/chai';

// Note, since tests are not built with production support, detect DEV_MODE
// by checking if warning API is available.
const DEV_MODE = !!ReactiveElement.enableWarning;

if (DEV_MODE) {
  ReactiveElement.disableWarning?.('change-in-update');
}

suite('ReactiveElement', () => {
  let container: HTMLElement;

  setup(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  teardown(() => {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  test(`renderRoot exists after connectedCallback`, async () => {
    class E extends ReactiveElement {
      hasRenderRoot = false;
      connectedCallback() {
        super.connectedCallback();
        this.hasRenderRoot = !!this.renderRoot;
      }
    }
    customElements.define(generateElementName(), E);
    const el = new E();
    container.appendChild(el);
    assert.isTrue(el.hasRenderRoot);
  });

  test(`createRenderRoot is called only once`, async () => {
    class E extends ReactiveElement {
      renderRootCalls = 0;
      createRenderRoot() {
        this.renderRootCalls++;
        return this;
      }
    }
    customElements.define(generateElementName(), E);
    const el = new E();
    container.appendChild(el);
    container.removeChild(el);
    container.appendChild(el);
    container.removeChild(el);
    container.appendChild(el);
    assert.equal(el.renderRootCalls, 1);
  });

  test('`updateComplete` waits for `requestUpdate` but does not trigger update, async', async () => {
    class E extends ReactiveElement {
      updateCount = 0;
      updated() {
        this.updateCount++;
      }
    }
    customElements.define(generateElementName(), E);
    const el = new E();
    container.appendChild(el);
    await el.updateComplete;
    assert.equal(el.updateCount, 1);
    await el.updateComplete;
    assert.equal(el.updateCount, 1);
    el.requestUpdate();
    await el.updateComplete;
    assert.equal(el.updateCount, 2);
    await el.updateComplete;
    assert.equal(el.updateCount, 2);
  });

  test('`shouldUpdate` controls update', async () => {
    class E extends ReactiveElement {
      needsUpdate = true;
      willUpdateCount = 0;
      updateCount = 0;
      updatedCount = 0;

      shouldUpdate() {
        return this.needsUpdate;
      }

      willUpdate() {
        this.willUpdateCount++;
      }

      update(props: PropertyValues) {
        super.update(props);
        this.updateCount++;
      }

      updated() {
        this.updatedCount++;
      }
    }
    customElements.define(generateElementName(), E);
    const el = new E();
    container.appendChild(el);
    await el.updateComplete;
    assert.equal(el.willUpdateCount, 1);
    assert.equal(el.updateCount, 1);
    assert.equal(el.updatedCount, 1);
    el.needsUpdate = false;
    el.requestUpdate();
    await el.updateComplete;
    assert.equal(el.willUpdateCount, 1);
    assert.equal(el.updateCount, 1);
    assert.equal(el.updatedCount, 1);
    el.needsUpdate = true;
    el.requestUpdate();
    await el.updateComplete;
    assert.equal(el.willUpdateCount, 2);
    assert.equal(el.updateCount, 2);
    assert.equal(el.updatedCount, 2);
    el.requestUpdate();
    await el.updateComplete;
    assert.equal(el.willUpdateCount, 3);
    assert.equal(el.updateCount, 3);
    assert.equal(el.updatedCount, 3);
  });

  test('property options', async () => {
    const hasChanged = (value: any, old: any) =>
      old === undefined || value > old;
    const fromAttribute = (value: any) => parseInt(value);
    const toAttribute = (value: any) => `${value}-attr`;
    class E extends ReactiveElement {
      static get properties() {
        return {
          noAttr: {attribute: false},
          atTr: {attribute: true},
          customAttr: {attribute: 'custom', reflect: true},
          hasChanged: {hasChanged},
          fromAttribute: {converter: fromAttribute},
          toAttribute: {reflect: true, converter: {toAttribute}},
          _state: {state: true},
          all: {
            attribute: 'all-attr',
            hasChanged,
            converter: {fromAttribute, toAttribute},
            reflect: true,
          },
        };
      }

      noAttr = 'noAttr';
      atTr = 'attr';
      customAttr = 'customAttr';
      hasChanged = 10;
      fromAttribute = 1;
      toAttribute = 1;
      all = 10;
      _state = 'internal';

      updateCount = 0;

      update(changed: PropertyValues) {
        this.updateCount++;
        super.update(changed);
      }
    }
    customElements.define(generateElementName(), E);
    const el = new E();
    container.appendChild(el);
    await el.updateComplete;
    assert.equal(el.updateCount, 1);
    assert.equal(el.noAttr, 'noAttr');
    assert.equal(el.atTr, 'attr');
    assert.equal(el.customAttr, 'customAttr');
    assert.equal(el.hasChanged, 10);
    assert.equal(el.fromAttribute, 1);
    assert.equal(el.toAttribute, 1);
    assert.equal(el.getAttribute('toattribute'), '1-attr');
    assert.equal(el.all, 10);
    assert.equal(el.getAttribute('all-attr'), '10-attr');
    assert.equal(el._state, 'internal');
    el.setAttribute('noattr', 'noAttr2');
    el.setAttribute('attr', 'attr2');
    el.setAttribute('custom', 'customAttr2');
    el.setAttribute('fromattribute', '2attr');
    el.setAttribute('_state', 'external');
    el.toAttribute = 2;
    el.all = 5;
    await el.updateComplete;
    assert.equal(el.updateCount, 2);
    assert.equal(el.noAttr, 'noAttr');
    assert.equal(el.atTr, 'attr2');
    assert.equal(el.customAttr, 'customAttr2');
    assert.equal(el.fromAttribute, 2);
    assert.equal(el.toAttribute, 2);
    assert.equal(el.getAttribute('toattribute'), '2-attr');
    assert.equal(el.all, 5);
    assert.equal(el._state, 'internal');
    el.all = 15;
    await el.updateComplete;
    assert.equal(el.updateCount, 3);
    assert.equal(el.all, 15);
    assert.equal(el.getAttribute('all-attr'), '15-attr');
    el.setAttribute('all-attr', '16-attr');
    await el.updateComplete;
    assert.equal(el.updateCount, 4);
    assert.equal(el.getAttribute('all-attr'), '16-attr');
    assert.equal(el.all, 16);
    el.hasChanged = 5;
    await el.updateComplete;
    assert.equal(el.hasChanged, 5);
    assert.equal(el.updateCount, 4);
    el.hasChanged = 15;
    await el.updateComplete;
    assert.equal(el.hasChanged, 15);
    assert.equal(el.updateCount, 5);
    el.setAttribute('all-attr', '5-attr');
    await el.updateComplete;
    assert.equal(el.all, 5);
    assert.equal(el.updateCount, 5);
    el.all = 15;
    await el.updateComplete;
    assert.equal(el.all, 15);
    assert.equal(el.updateCount, 6);
  });

  test('property option `converter` can use `type` info', async () => {
    const FooType = {name: 'FooType'};
    // Make test work on IE where these are undefined.
    if (!('name' in String)) {
      (String as any).name = (String as any).name || 'String';
    }
    if (!('name' in Number)) {
      (Number as any).name = (Number as any).name || 'Number';
    }

    const converter: ComplexAttributeConverter = {
      fromAttribute: (_value: any, type: any) => {
        return `fromAttribute: ${String(type.name)}`;
      },
      toAttribute: (_value: any, type: any) => {
        return `toAttribute: ${String(type.name)}`;
      },
    };

    class E extends ReactiveElement {
      static get properties() {
        return {
          num: {type: Number, converter, reflect: true},
          str: {type: String, converter, reflect: true},
          foo: {type: FooType, converter, reflect: true},
        };
      }

      num?: any;
      str?: any;
      foo?: any;
    }
    customElements.define(generateElementName(), E);
    const el = new E();
    container.appendChild(el);
    await el.updateComplete;
    el.num = 5;
    el.str = 'hi';
    el.foo = 'zoink';
    await el.updateComplete;
    assert.equal(el.getAttribute('num'), 'toAttribute: Number');
    assert.equal(el.getAttribute('str'), 'toAttribute: String');
    assert.equal(el.getAttribute('foo'), 'toAttribute: FooType');
    el.removeAttribute('num');
    el.removeAttribute('str');
    el.removeAttribute('foo');
    await el.updateComplete;
    assert.equal(el.num, 'fromAttribute: Number');
    assert.equal(el.str, 'fromAttribute: String');
    assert.equal(el.foo, 'fromAttribute: FooType');
    assert.equal(el.getAttribute('num'), null);
    assert.equal(el.getAttribute('str'), null);
    assert.equal(el.getAttribute('foo'), null);
    el.num = 0;
    el.str = '';
    el.foo = {};
    await el.updateComplete;
    assert.equal(el.getAttribute('num'), 'toAttribute: Number');
    assert.equal(el.getAttribute('str'), 'toAttribute: String');
    assert.equal(el.getAttribute('foo'), 'toAttribute: FooType');
  });

  test('property/attribute values when attributes removed', async () => {
    class E extends ReactiveElement {
      static get properties() {
        return {
          bool: {type: Boolean},
          num: {type: Number},
          str: {type: String},
          obj: {type: Object},
          arr: {type: Array},
          reflectBool: {type: Boolean, reflect: true},
          reflectNum: {type: Number, reflect: true},
          reflectStr: {type: String, reflect: true},
          reflectObj: {type: Object, reflect: true},
          reflectArr: {type: Array, reflect: true},
          defaultBool: {type: Boolean},
          defaultNum: {type: Number},
          defaultStr: {type: String},
          defaultObj: {type: Object},
          defaultArr: {type: Array},
          defaultReflectBool: {type: Boolean, reflect: true},
          defaultReflectNum: {type: Number, reflect: true},
          defaultReflectStr: {type: String, reflect: true},
          defaultReflectObj: {type: Object, reflect: true},
          defaultReflectArr: {type: Array, reflect: true},
        };
      }

      bool?: any;
      num?: any;
      str?: any;
      obj?: any;
      arr?: any;
      reflectBool?: any;
      reflectNum?: any;
      reflectStr?: any;
      reflectObj?: any;
      reflectArr?: any;
      defaultBool = false;
      defaultNum = 0;
      defaultStr = '';
      defaultObj = {defaultObj: false};
      defaultArr = [1];
      defaultReflectBool = false;
      defaultReflectNum = 0;
      defaultReflectStr = 'defaultReflectStr';
      defaultReflectObj = {defaultReflectObj: true};
      defaultReflectArr = [1, 2];
    }
    const name = generateElementName();
    customElements.define(name, E);
    container.innerHTML = `<${name} bool num="2" str="str" obj='{"obj": true}'
      arr='[1]' reflectBool reflectNum="3" reflectStr="reflectStr"
      reflectObj ='{"reflectObj": true}' reflectArr="[1, 2]"
      defaultBool defaultNum="4" defaultStr="defaultStr"
      defaultObj='{"defaultObj": true}' defaultArr="[1, 2, 3]">
      </${name}>`;
    const el = container.firstChild as E;
    await el.updateComplete;
    assert.equal(el.bool, true);
    assert.equal(el.num, 2);
    assert.equal(el.str, 'str');
    assert.deepEqual(el.obj, {obj: true});
    assert.deepEqual(el.arr, [1]);
    assert.equal(el.reflectBool, true);
    assert.equal(el.reflectNum, 3);
    assert.equal(el.reflectStr, 'reflectStr');
    assert.deepEqual(el.reflectObj, {reflectObj: true});
    assert.deepEqual(el.reflectArr, [1, 2]);
    assert.equal(el.defaultBool, true);
    assert.equal(el.defaultNum, 4);
    assert.equal(el.defaultStr, 'defaultStr');
    assert.deepEqual(el.defaultObj, {defaultObj: true});
    assert.deepEqual(el.defaultArr, [1, 2, 3]);
    assert.equal(el.defaultReflectBool, false);
    assert.equal(el.defaultReflectNum, 0);
    assert.equal(el.defaultReflectStr, 'defaultReflectStr');
    assert.deepEqual(el.defaultReflectObj, {defaultReflectObj: true});
    assert.deepEqual(el.defaultReflectArr, [1, 2]);
    el.removeAttribute('bool');
    el.removeAttribute('num');
    el.removeAttribute('str');
    el.removeAttribute('obj');
    el.removeAttribute('arr');
    el.removeAttribute('reflectbool');
    el.removeAttribute('reflectnum');
    el.removeAttribute('reflectstr');
    el.removeAttribute('reflectobj');
    el.removeAttribute('reflectarr');
    el.removeAttribute('defaultbool');
    el.removeAttribute('defaultnum');
    el.removeAttribute('defaultstr');
    el.removeAttribute('defaultobj');
    el.removeAttribute('defaultarr');
    el.removeAttribute('defaultreflectbool');
    el.removeAttribute('defaultreflectnum');
    el.removeAttribute('defaultreflectstr');
    el.removeAttribute('defaultreflectobj');
    el.removeAttribute('defaultreflectarr');
    await el.updateComplete;
    assert.equal(el.bool, false);
    assert.equal(el.num, null);
    assert.equal(el.str, null);
    assert.deepEqual(el.obj, null);
    assert.deepEqual(el.arr, null);
    assert.equal(el.reflectBool, false);
    assert.equal(el.reflectNum, null);
    assert.equal(el.reflectStr, null);
    assert.deepEqual(el.reflectObj, null);
    assert.deepEqual(el.reflectArr, null);
    assert.equal(el.defaultBool, false);
    assert.equal(el.defaultNum, null);
    assert.equal(el.defaultStr, null);
    assert.deepEqual(el.defaultObj, null);
    assert.deepEqual(el.defaultArr, null);
    assert.equal(el.defaultReflectBool, false);
    assert.equal(el.defaultReflectNum, null);
    assert.equal(el.defaultReflectStr, null);
    assert.deepEqual(el.defaultReflectObj, null);
    assert.deepEqual(el.defaultReflectArr, null);
  });

  test("attributes removed when a reflecting property's value becomes null", async () => {
    class E extends ReactiveElement {
      static get properties() {
        return {
          bool: {type: Boolean, reflect: true},
          num: {type: Number, reflect: true},
          str: {type: String, reflect: true},
          obj: {type: Object, reflect: true},
          arr: {type: Array, reflect: true},
        };
      }

      bool?: any;
      num?: any;
      str?: any;
      obj?: any;
      arr?: any;
    }
    const name = generateElementName();
    customElements.define(name, E);
    container.innerHTML = `<${name} bool num="2" str="str" obj='{"obj": true}'
      arr='[1]'>
      </${name}>`;
    const el = container.firstChild as E;
    await el.updateComplete;
    el.bool = false;
    el.num = null;
    el.str = null;
    el.obj = null;
    el.arr = null;
    await el.updateComplete;
    assert.isFalse(el.hasAttribute('bool'));
    assert.isFalse(el.hasAttribute('num'));
    assert.isFalse(el.hasAttribute('str'));
    assert.isFalse(el.hasAttribute('obj'));
    assert.isFalse(el.hasAttribute('arr'));
  });

  test('if a `reflect: true` returns `undefined`, the attribute is removed', async () => {
    class E extends ReactiveElement {
      static get properties() {
        return {foo: {reflect: true}, obj: {type: Object, reflect: true}};
      }

      foo?: any;
      obj?: any;
    }
    const name = generateElementName();
    customElements.define(name, E);
    const el = new E();
    container.appendChild(el);
    await el.updateComplete;
    el.setAttribute('foo', 'foo');
    el.setAttribute('obj', '{"obj": 1}');
    assert.equal(el.foo, 'foo');
    assert.deepEqual(el.obj, {obj: 1});
    await el.updateComplete;
    el.foo = 'foo2';
    el.obj = {obj: 2};
    await el.updateComplete;
    assert.equal(el.getAttribute('foo'), 'foo2');
    assert.equal(el.getAttribute('obj'), '{"obj":2}');
    el.foo = undefined;
    el.obj = undefined;
    await el.updateComplete;
    assert.equal(el.getAttribute('foo'), null);
    assert.equal(el.getAttribute('obj'), null);
    el.foo = 'foo3';
    el.obj = {obj: 3};
    await el.updateComplete;
    assert.equal(el.getAttribute('foo'), 'foo3');
    assert.equal(el.getAttribute('obj'), '{"obj":3}');
  });

  test('property reflects when set in response to another propety changing via its attribute being set', async () => {
    class E extends ReactiveElement {
      static get properties() {
        return {
          prop: {type: Boolean, noAccessor: true, reflect: true},
          secondary: {type: Number, reflect: true},
          tertiary: {type: Number, reflect: true},
        };
      }

      _prop = false;
      secondary = 0;
      tertiary = 0;
      propCount = 0;

      get prop() {
        return this._prop;
      }

      set prop(val) {
        this.propCount++;
        const oldVal = this._prop;
        if (oldVal !== val) {
          this._prop = val;
          this.secondary += 1;
          this.tertiary += 1;
          this.requestUpdate('prop', oldVal);
        }
      }
    }
    customElements.define(generateElementName(), E);
    const el = new E();
    container.appendChild(el);
    await el.updateComplete;
    assert.equal(el.propCount, 0);
    assert.equal(el.getAttribute('secondary'), '0');
    assert.equal(el.getAttribute('tertiary'), '0');
    el.prop = true;
    await el.updateComplete;
    assert.equal(el.propCount, 1);
    assert.equal(el.getAttribute('secondary'), '1');
    assert.equal(el.getAttribute('tertiary'), '1');
    el.prop = false;
    await el.updateComplete;
    assert.equal(el.propCount, 2);
    assert.equal(el.getAttribute('secondary'), '2');
    assert.equal(el.getAttribute('tertiary'), '2');
    el.setAttribute('prop', '');
    await el.updateComplete;
    assert.equal(el.propCount, 3);
    assert.equal(el.getAttribute('secondary'), '3');
    assert.equal(el.getAttribute('tertiary'), '3');
  });

  test('attributes deserialize from html', async () => {
    const fromAttribute = (value: any) => parseInt(value);
    const toAttributeOnly = (value: any) =>
      typeof value === 'string' && value.indexOf(`-attr`) > 0
        ? value
        : `${value}-attr`;
    const toAttribute = (value: any) => `${value}-attr`;
    class E extends ReactiveElement {
      static get properties() {
        return {
          noAttr: {attribute: false},
          atTr: {attribute: true},
          customAttr: {attribute: 'custom', reflect: true},
          fromAttribute: {converter: fromAttribute},
          toAttribute: {
            reflect: true,
            converter: {toAttribute: toAttributeOnly},
          },
          toAttributeNumber: {
            type: Number,
            reflect: true,
            converter: {toAttribute: (value: number) => value + ' '},
          },
          all: {
            attribute: 'all-attr',
            converter: {fromAttribute, toAttribute},
            reflect: true,
          },
          obj: {type: Object},
          arr: {type: Array},
        };
      }

      noAttr = 'noAttr';
      atTr = 'attr';
      customAttr = 'customAttr';
      fromAttribute = 1;
      toAttribute: string | number = 1;
      toAttributeNumber = 0;
      all = 10;
      obj?: any;
      arr?: any;
    }
    const name = generateElementName();
    customElements.define(name, E);
    container.innerHTML = `<${name}
      noattr="1"
      attr="2"
      custom="3"
      fromAttribute="6-attr"
      toAttribute="7"
      toAttributeNumber="8"
      all-attr="11-attr"
      obj='{"foo": true, "bar": 5, "baz": "hi"}'
      arr="[1, 2, 3, 4]"></${name}>`;
    const el = container.firstChild as E;
    await el.updateComplete;
    assert.equal(el.noAttr, 'noAttr');
    assert.equal(el.getAttribute('noattr'), '1');
    assert.equal(el.atTr, '2');
    assert.equal(el.customAttr, '3');
    assert.equal(el.getAttribute('custom'), '3');
    assert.equal(el.fromAttribute, 6);
    assert.equal(el.toAttribute, '7');
    assert.strictEqual(el.toAttributeNumber, 8);
    assert.equal(el.getAttribute('toattribute'), '7-attr');
    assert.equal(el.all, 11);
    assert.equal(el.getAttribute('all-attr'), '11-attr');
    assert.deepEqual(el.obj, {foo: true, bar: 5, baz: 'hi'});
    assert.deepEqual(el.arr, [1, 2, 3, 4]);
  });

  test('deserializing from invalid values does not produce exception', async () => {
    class E extends ReactiveElement {
      static get properties() {
        return {
          obj: {type: Object, reflect: true},
          arr: {type: Array, reflect: true},
          prop: {reflect: true},
        };
      }

      obj?: any;
      arr?: any;
      prop?: string;
    }
    const name = generateElementName();
    let error = false;
    const listener = () => {
      error = true;
    };
    window.addEventListener('error', listener);
    customElements.define(name, E);
    container.innerHTML = `<${name}
      obj='{foo: true}'
      arr="[1, 2, 3, 4]"
      prop="prop"></${name}>`;
    const el = container.firstChild as E;
    await el.updateComplete;
    assert.isFalse(error);
    assert.equal(el.obj, undefined);
    assert.equal(el.prop, 'prop');
    assert.deepEqual(el.arr, [1, 2, 3, 4]);
    window.removeEventListener('error', listener);
  });

  if ((Object as Partial<typeof Object>).getOwnPropertySymbols) {
    test('properties defined using symbols', async () => {
      const zug = Symbol();

      class E extends ReactiveElement {
        static get properties() {
          return {foo: {}, [zug]: {}};
        }
        updateCount = 0;
        foo = 5;
        [zug] = 6;

        update(changedProperties: PropertyValues) {
          this.updateCount++;
          super.update(changedProperties);
        }
      }
      customElements.define(generateElementName(), E);
      const el = new E();
      container.appendChild(el);
      await el.updateComplete;
      assert.equal(el.updateCount, 1);
      assert.equal(el.foo, 5);
      assert.equal(el[zug], 6);
      el.foo = 55;
      await el.updateComplete;
      assert.equal(el.updateCount, 2);
      assert.equal(el.foo, 55);
      assert.equal(el[zug], 6);
      el[zug] = 66;
      await el.updateComplete;
      assert.equal(el.updateCount, 3);
      assert.equal(el.foo, 55);
      assert.equal(el[zug], 66);
    });

    test('properties as symbols can set property options', async () => {
      const zug = Symbol();

      class E extends ReactiveElement {
        static get properties() {
          return {
            [zug]: {
              attribute: 'zug',
              reflect: true,
              converter: (value: string) => Number(value) + 100,
            },
          };
        }

        constructor() {
          super();
          (this as any)[zug] = 5;
        }
      }
      customElements.define(generateElementName(), E);
      const el = new E() as any;
      container.appendChild(el);
      await el.updateComplete;
      assert.equal(el[zug], 5);
      assert.equal(el.getAttribute('zug'), '5');
      el[zug] = 6;
      await el.updateComplete;
      assert.equal(el[zug], 6);
      assert.equal(el.getAttribute('zug'), '6');
      el.setAttribute('zug', '7');
      await el.updateComplete;
      assert.equal(el.getAttribute('zug'), '7');
      assert.equal(el[zug], 107);
    });
  }

  test('property options compose when subclassing', async () => {
    const hasChanged = (value: any, old: any) =>
      old === undefined || value > old;
    const fromAttribute = (value: any) => parseInt(value);
    const toAttribute = (value: any) => `${value}-attr`;
    class E extends ReactiveElement {
      static get properties(): PropertyDeclarations {
        return {
          noAttr: {attribute: false},
          atTr: {attribute: true},
          customAttr: {},
          hasChanged: {},
        };
      }

      noAttr = 'noAttr';
      atTr = 'attr';
      customAttr = 'customAttr';
      hasChanged = 10;

      updateCount = 0;

      update(changed: PropertyValues) {
        this.updateCount++;
        super.update(changed);
      }
    }
    customElements.define(generateElementName(), E);

    class F extends E {
      static get properties(): PropertyDeclarations {
        return {
          customAttr: {attribute: 'custom', reflect: true},
          hasChanged: {hasChanged},
          fromAttribute: {},
          toAttribute: {},
        };
      }

      fromAttribute = 1;
      toAttribute = 1;
      all = 10;
    }

    class G extends F {
      static get properties(): PropertyDeclarations {
        return {
          fromAttribute: {converter: fromAttribute},
          toAttribute: {reflect: true, converter: {toAttribute}},
          all: {
            attribute: 'all-attr',
            hasChanged,
            converter: {fromAttribute, toAttribute},
            reflect: true,
          },
        };
      }
    }

    customElements.define(generateElementName(), G);

    const el = new G();
    container.appendChild(el);
    await el.updateComplete;
    assert.equal(el.updateCount, 1);
    assert.equal(el.noAttr, 'noAttr');
    assert.equal(el.atTr, 'attr');
    assert.equal(el.customAttr, 'customAttr');
    assert.equal(el.hasChanged, 10);
    assert.equal(el.fromAttribute, 1);
    assert.equal(el.toAttribute, 1);
    assert.equal(el.getAttribute('toattribute'), '1-attr');
    assert.equal(el.all, 10);
    assert.equal(el.getAttribute('all-attr'), '10-attr');
    el.setAttribute('noattr', 'noAttr2');
    el.setAttribute('attr', 'attr2');
    el.setAttribute('custom', 'customAttr2');
    el.setAttribute('fromattribute', '2attr');
    el.toAttribute = 2;
    el.all = 5;
    await el.updateComplete;
    assert.equal(el.updateCount, 2);
    assert.equal(el.noAttr, 'noAttr');
    assert.equal(el.atTr, 'attr2');
    assert.equal(el.customAttr, 'customAttr2');
    assert.equal(el.fromAttribute, 2);
    assert.equal(el.toAttribute, 2);
    assert.equal(el.getAttribute('toattribute'), '2-attr');
    assert.equal(el.all, 5);
    el.all = 15;
    await el.updateComplete;
    assert.equal(el.updateCount, 3);
    assert.equal(el.all, 15);
    assert.equal(el.getAttribute('all-attr'), '15-attr');
    el.setAttribute('all-attr', '16-attr');
    await el.updateComplete;
    assert.equal(el.updateCount, 4);
    assert.equal(el.getAttribute('all-attr'), '16-attr');
    assert.equal(el.all, 16);
    el.hasChanged = 5;
    await el.updateComplete;
    assert.equal(el.hasChanged, 5);
    assert.equal(el.updateCount, 4);
    el.hasChanged = 15;
    await el.updateComplete;
    assert.equal(el.hasChanged, 15);
    assert.equal(el.updateCount, 5);
    el.setAttribute('all-attr', '5-attr');
    await el.updateComplete;
    assert.equal(el.all, 5);
    assert.equal(el.updateCount, 5);
    el.all = 15;
    await el.updateComplete;
    assert.equal(el.all, 15);
    assert.equal(el.updateCount, 6);
  });

  test('superclass properties not affected by subclass', async () => {
    class E extends ReactiveElement {
      static get properties(): PropertyDeclarations {
        return {
          foo: {attribute: 'zug', reflect: true},
          bar: {reflect: true},
        };
      }

      foo = 5;
      bar = 'bar';
    }
    customElements.define(generateElementName(), E);

    class F extends E {
      static get properties(): PropertyDeclarations {
        return {foo: {attribute: false}, nug: {}};
      }

      foo = 6;
      bar = 'subbar';
      nug = 5;
    }
    customElements.define(generateElementName(), F);

    const el = new E();
    const sub = new F();
    container.appendChild(el);
    await el.updateComplete;
    container.appendChild(sub);
    await sub.updateComplete;

    assert.equal(el.foo, 5);
    assert.equal(el.getAttribute('zug'), '5');
    assert.isFalse(el.hasAttribute('foo'));
    assert.equal(el.bar, 'bar');
    assert.equal(el.getAttribute('bar'), 'bar');
    assert.isUndefined((el as any).nug);

    assert.equal(sub.foo, 6);
    assert.isFalse(sub.hasAttribute('zug'));
    assert.isFalse(sub.hasAttribute('foo'));
    assert.equal(sub.bar, 'subbar');
    assert.equal(sub.getAttribute('bar'), 'subbar');
    assert.equal(sub.nug, 5);
  });

  test('Attributes reflect', async () => {
    const suffix = '-reflected';
    class E extends ReactiveElement {
      static get properties() {
        return {
          foo: {
            reflect: true,
            converter: {toAttribute: (value: any) => `${value}${suffix}`},
          },
        };
      }

      foo = 0;
    }
    customElements.define(generateElementName(), E);
    const el = new E();
    container.appendChild(el);
    await el.updateComplete;
    assert.equal(el.getAttribute('foo'), `0${suffix}`);
    el.foo = 5;
    await el.updateComplete;
    assert.equal(el.getAttribute('foo'), `5${suffix}`);
  });

  test('Attributes reflect with type: Boolean', async () => {
    class E extends ReactiveElement {
      static get properties() {
        return {bar: {type: Boolean, reflect: true}};
      }

      bar = true;
    }
    customElements.define(generateElementName(), E);
    const el = new E();
    container.appendChild(el);
    await el.updateComplete;
    assert.equal(el.getAttribute('bar'), '');
    el.bar = false;
    await el.updateComplete;
    assert.equal(el.hasAttribute('bar'), false);
    el.bar = true;
    await el.updateComplete;
    assert.equal(el.getAttribute('bar'), '');
  });

  test('updates when properties change', async () => {
    class E extends ReactiveElement {
      static get properties() {
        return {foo: {}};
      }

      foo = 'one';
      updatedText = '';

      updated() {
        this.updatedText = `${this.foo}`;
      }
    }
    customElements.define(generateElementName(), E);
    const el = new E();
    container.appendChild(el);
    await el.updateComplete;
    assert.equal(el.updatedText, 'one');
    el.foo = 'changed';
    await el.updateComplete;
    assert.equal(el.updatedText, 'changed');
  });

  test('updates when properties and attributes change', async () => {
    class E extends ReactiveElement {
      static get properties() {
        return {value: {}, attrValue: {}};
      }

      value = '1';
      attrValue = 'attr';

      updateCountValue = '';
      updateCountAttrValue = '';

      update(props: PropertyValues) {
        super.update(props);
        this.updateCountValue = this.value;
        this.updateCountAttrValue = this.attrValue;
      }
    }
    customElements.define(generateElementName(), E);
    const el = new E();
    container.appendChild(el);
    await el.updateComplete;
    assert.equal(el.updateCountValue, '1');
    assert.equal(el.updateCountAttrValue, 'attr');
    el.value = '2';
    await el.updateComplete;
    assert.equal(el.updateCountValue, '2');
    assert.equal(el.updateCountAttrValue, 'attr');
    el.attrValue = 'attr2';
    await el.updateComplete;
    assert.equal(el.updateCountValue, '2');
    assert.equal(el.updateCountAttrValue, 'attr2');
    el.setAttribute('attrvalue', 'attr3');
    await el.updateComplete;
    assert.equal(el.updateCountValue, '2');
    assert.equal(el.updateCountAttrValue, 'attr3');
    el.value = '3';
    el.setAttribute('attrvalue', 'attr4');
    await el.updateComplete;
    assert.equal(el.updateCountValue, '3');
    assert.equal(el.updateCountAttrValue, 'attr4');
  });

  test('updates changes when attributes change', async () => {
    class E extends ReactiveElement {
      static get properties() {
        return {foo: {}};
      }

      foo = 'one';
      updatedText = '';

      updated() {
        this.updatedText = `${this.foo}`;
      }
    }
    customElements.define(generateElementName(), E);
    const el = new E();
    container.appendChild(el);
    await el.updateComplete;
    assert.equal(el.updatedText, 'one');
    el.setAttribute('foo', 'changed');
    await el.updateComplete;
    assert.equal(el.updatedText, 'changed');
  });

  test('User defined accessor can trigger update', async () => {
    class E extends ReactiveElement {
      __bar?: number;

      updatedText = '';

      static get properties() {
        return {foo: {}, bar: {}};
      }

      foo = 0;

      get bar() {
        return this.__bar;
      }

      set bar(value) {
        const old = this.bar;
        this.__bar = Number(value);
        this.requestUpdate('bar', old);
      }

      updated() {
        this.updatedText = `${this.foo}${this.bar}`;
      }
    }
    customElements.define(generateElementName(), E);
    const el = new E();
    container.appendChild(el);
    el.setAttribute('bar', '20');
    await el.updateComplete;
    assert.equal(el.bar, 20);
    assert.equal(el.__bar, 20);
    assert.equal(el.updatedText, '020');
  });

  test('User defined accessor can use property options via `requestUpdate`', async () => {
    const fromAttribute = (value: any) => parseInt(value);
    const toAttribute = (value: any) => `${value}-attr`;
    const hasChanged = (value: any, old: any) => isNaN(old) || value > old;
    class E extends ReactiveElement {
      updateCount = 0;
      __bar: any;

      static get properties() {
        return {
          bar: {
            attribute: 'attr-bar',
            reflect: true,
            converter: {fromAttribute, toAttribute},
            hasChanged,
          },
        };
      }

      constructor() {
        super();
        this.bar = 5;
      }

      update(changed: PropertyValues) {
        super.update(changed);
        this.updateCount++;
      }

      get bar() {
        return this.__bar;
      }

      set bar(value) {
        const old = this.bar;
        this.__bar = Number(value);
        this.requestUpdate('bar', old);
      }
    }
    customElements.define(generateElementName(), E);
    const el = new E();
    container.appendChild(el);
    await el.updateComplete;
    assert.equal(el.updateCount, 1);
    assert.equal(el.bar, 5);
    assert.equal(el.getAttribute('attr-bar'), `5-attr`);
    el.setAttribute('attr-bar', '7');
    await el.updateComplete;
    assert.equal(el.updateCount, 2);
    assert.equal(el.bar, 7);
    assert.equal(el.getAttribute('attr-bar'), `7`);
    el.bar = 4;
    await el.updateComplete;
    assert.equal(el.updateCount, 2);
    assert.equal(el.bar, 4);
    assert.equal(el.getAttribute('attr-bar'), `7`);
    el.setAttribute('attr-bar', '3');
    await el.updateComplete;
    assert.equal(el.updateCount, 2);
    assert.equal(el.bar, 3);
    assert.equal(el.getAttribute('attr-bar'), `3`);
  });

  test('User defined accessor not overwritten by subclass, but subclass property options respected', async () => {
    class E extends ReactiveElement {
      __foo?: number;

      static get properties(): PropertyDeclarations {
        return {bar: {hasChanged: () => false}, foo: {}};
      }

      get foo() {
        return this.__foo;
      }

      set foo(value) {
        const old = this.foo;
        this.__foo = Number(value);
        this.requestUpdate('foo', old);
      }
    }
    class F extends E {
      __bar?: string;

      static get properties(): PropertyDeclarations {
        return {bar: {}, foo: {reflect: true}};
      }

      get bar() {
        return this.__bar;
      }

      set bar(value) {
        const old = this.foo;
        this.__bar = value;
        this.requestUpdate('bar', old);
      }
    }

    let changed = 0;

    const hasChanged = () => {
      changed++;
      return true;
    };

    class G extends F {
      static get properties(): PropertyDeclarations {
        return {bar: {hasChanged, reflect: true}, foo: {hasChanged}};
      }
    }

    customElements.define(generateElementName(), G);
    const el = new G();
    container.appendChild(el);
    el.foo = 20;
    await el.updateComplete;
    assert.equal(changed, 1);
    assert.equal(el.foo, 20);
    assert.equal(el.__foo, 20);
    assert.isFalse(el.hasAttribute('foo'));
    el.bar = 'hi';
    await el.updateComplete;
    assert.equal(changed, 2);
    assert.equal(el.bar, 'hi');
    assert.equal(el.__bar, 'hi');
    assert.isTrue(el.hasAttribute('bar'));
  });

  test('`firstUpdated` called when element first updates', async () => {
    class E extends ReactiveElement {
      static properties = {foo: {}};
      foo = 1;

      wasUpdatedCount = 0;
      wasFirstUpdated = 0;
      changedProperties: PropertyValues | undefined;

      update(changedProperties: PropertyValues) {
        this.wasUpdatedCount++;
        super.update(changedProperties);
      }

      firstUpdated(changedProperties: PropertyValues) {
        this.changedProperties = changedProperties;
        this.wasFirstUpdated++;
      }
    }
    customElements.define(generateElementName(), E);
    const el = new E();
    container.appendChild(el);
    await el.updateComplete;
    const testMap = new Map();
    testMap.set('foo', undefined);
    assert.deepEqual(el.changedProperties, testMap);
    assert.equal(el.wasUpdatedCount, 1);
    assert.equal(el.wasFirstUpdated, 1);
    el.requestUpdate();
    await el.updateComplete;
    assert.equal(el.wasUpdatedCount, 2);
    assert.equal(el.wasFirstUpdated, 1);
    el.requestUpdate();
    await el.updateComplete;
    assert.equal(el.wasUpdatedCount, 3);
    assert.equal(el.wasFirstUpdated, 1);
  });

  test('`firstUpdated` called when element first updates even if first `shouldUpdate` returned false', async () => {
    class E extends ReactiveElement {
      static properties = {foo: {}};
      foo = 1;

      triedToUpdatedCount = 0;
      wasUpdatedCount = 0;
      wasFirstUpdated = 0;
      changedProperties: PropertyValues | undefined;

      shouldUpdate() {
        this.triedToUpdatedCount++;
        return this.triedToUpdatedCount > 1;
      }

      update(changedProperties: PropertyValues) {
        this.wasUpdatedCount++;
        super.update(changedProperties);
      }

      firstUpdated(changedProperties: PropertyValues) {
        this.changedProperties = changedProperties;
        this.wasFirstUpdated++;
      }
    }

    customElements.define(generateElementName(), E);
    const el = new E();
    container.appendChild(el);
    await el.updateComplete;
    assert.equal(el.triedToUpdatedCount, 1);
    assert.equal(el.wasUpdatedCount, 0);
    assert.equal(el.wasFirstUpdated, 0);
    el.requestUpdate();
    await el.updateComplete;
    const testMap = new Map();
    assert.deepEqual(el.changedProperties, testMap);
    assert.equal(el.triedToUpdatedCount, 2);
    assert.equal(el.wasUpdatedCount, 1);
    assert.equal(el.wasFirstUpdated, 1);
    el.requestUpdate();
    await el.updateComplete;
    assert.equal(el.triedToUpdatedCount, 3);
    assert.equal(el.wasUpdatedCount, 2);
    assert.equal(el.wasFirstUpdated, 1);
  });

  test('update lifecycle order', async () => {
    class E extends ReactiveElement {
      static get properties() {
        return {foo: {type: Number}};
      }

      info: Array<string> = [];

      shouldUpdate() {
        this.info.push('shouldUpdate');
        return true;
      }

      willUpdate() {
        this.info.push('willUpdate');
      }

      update(props: PropertyValues) {
        this.info.push('before-update');
        super.update(props);
        this.info.push('after-update');
      }

      firstUpdated() {
        this.info.push('firstUpdated');
      }

      updated() {
        this.info.push('updated');
      }
    }
    customElements.define(generateElementName(), E);
    const el = new E();
    container.appendChild(el);
    await el.updateComplete;
    el.info.push('updateComplete');
    assert.deepEqual(el.info, [
      'shouldUpdate',
      'willUpdate',
      'before-update',
      'after-update',
      'firstUpdated',
      'updated',
      'updateComplete',
    ]);
  });

  test('setting properties in update does not trigger update', async () => {
    class E extends ReactiveElement {
      static get properties() {
        return {foo: {}};
      }
      promiseFulfilled = false;
      foo = 0;
      updateCount = 0;
      updatedText = '';

      update(props: PropertyValues) {
        this.updateCount++;
        this.foo++;
        super.update(props);
      }

      updated() {
        this.updatedText = `${this.foo}`;
      }
    }
    customElements.define(generateElementName(), E);
    const el = new E();
    container.appendChild(el);
    await el.updateComplete;
    assert.equal(el.foo, 1);
    assert.equal(el.updateCount, 1);
    assert.equal(el.updatedText, '1');
    el.foo = 5;
    await el.updateComplete;
    assert.equal(el.foo, 6);
    assert.equal(el.updateCount, 2);
    assert.equal(el.updatedText, '6');
  });

  test('setting properties in update after calling `super.update` *does* trigger update', async () => {
    class E extends ReactiveElement {
      static get properties() {
        return {foo: {}};
      }
      promiseFulfilled = false;
      foo = 0;
      updateCount = 0;
      updatedText = '';

      update(props: PropertyValues) {
        this.updateCount++;
        super.update(props);
        if (this.foo < 1) {
          this.foo++;
        }
      }

      updated() {
        this.updatedText = `${this.foo}`;
      }
    }
    customElements.define(generateElementName(), E);
    const el = new E();
    container.appendChild(el);
    // eslint-disable-next-line no-empty
    while (!(await el.updateComplete)) {}
    assert.equal(el.foo, 1);
    assert.equal(el.updateCount, 2);
    assert.equal(el.updatedText, '1');
  });

  test('setting properties in update reflects to attribute and is included in `changedProperties`', async () => {
    class E extends ReactiveElement {
      static get properties() {
        return {foo: {}, bar: {}, zot: {reflect: true}};
      }

      changedProperties: PropertyValues | undefined = undefined;

      update(changedProperties: PropertyValues) {
        (this as any).zot = (this as any).foo + (this as any).bar;
        super.update(changedProperties);
        this.changedProperties = changedProperties;
      }
    }
    customElements.define(generateElementName(), E);
    const el = new E() as any;
    container.appendChild(el);
    await el.updateComplete;
    const testMap = new Map();
    testMap.set('zot', undefined);
    assert.deepEqual(el.changedProperties, testMap);
    assert.isNaN(el.zot);
    assert.equal(el.getAttribute('zot'), 'NaN');
    el.bar = 1;
    el.foo = 1;
    await el.updateComplete;
    assert.equal(el.foo, 1);
    assert.equal(el.bar, 1);
    assert.equal(el.zot, 2);
    testMap.clear();
    testMap.set('foo', undefined);
    testMap.set('bar', undefined);
    testMap.set('zot', NaN);
    assert.deepEqual(el.changedProperties, testMap);
    assert.equal(el.getAttribute('zot'), '2');
    el.bar = 2;
    await el.updateComplete;
    assert.equal(el.bar, 2);
    assert.equal(el.zot, 3);
    testMap.clear();
    testMap.set('bar', 1);
    testMap.set('zot', 2);
    assert.deepEqual(el.changedProperties, testMap);
    assert.equal(el.getAttribute('zot'), '3');
  });

  // Note, on older browsers (e.g. old Safari/Chrome), native properties
  // cannot have default values. These will be overwritten by instance values.
  test('can make properties for native accessors', async () => {
    class E extends ReactiveElement {
      static get properties() {
        return {
          id: {reflect: true},
          name: {reflect: true},
          title: {reflect: true},
          foo: {},
        };
      }

      updatedText = '';

      name: string | undefined;
      foo = '';

      changedProperties: PropertyValues | undefined = undefined;

      update(changedProperties: PropertyValues) {
        (this as any).zot = (this as any).foo + (this as any).bar;
        super.update(changedProperties);
        this.changedProperties = changedProperties;
      }

      updated() {
        this.updatedText = `${this.id}-${this.title}-${this.foo}`;
      }
    }
    customElements.define(generateElementName(), E);
    const el = new E() as any;
    container.appendChild(el);
    await el.updateComplete;
    el.foo = 'foo';
    el.id = 'id';
    el.title = 'title';
    await el.updateComplete;
    assert.equal(el.updatedText, 'id-title-foo');
    assert.equal((window as any).id, el);
    assert.equal(el.getAttribute('id'), 'id');
    el.id = 'id2';
    await el.updateComplete;
    assert.equal(el.updatedText, 'id2-title-foo');
    assert.equal((window as any).id2, el);
    assert.equal(el.getAttribute('id'), 'id2');
  });

  test('user accessors', async () => {
    class E extends ReactiveElement {
      _updateCount = 0;
      updatedText = '';
      _foo?: string;
      _bar?: string;
      static get properties() {
        return {
          foo: {type: String, reflect: true},
          bar: {type: String, reflect: true},
        };
      }
      constructor() {
        super();
        this.foo = 'defaultFoo';
        this.bar = 'defaultBar';
      }
      set foo(value: string) {
        const old = this._foo;
        this._foo = value;
        this.requestUpdate('foo', old);
      }
      get foo() {
        return this._foo as string;
      }
      set bar(value: string) {
        const old = this._bar;
        this._bar = value;
        this.requestUpdate('bar', old);
      }
      get bar() {
        return this._bar as string;
      }
      update(changedProperties: PropertyValues) {
        this._updateCount++;
        super.update(changedProperties);
      }
      updated() {
        this.updatedText = `${this.foo}-${this.bar}`;
      }
    }
    customElements.define(generateElementName(), E);

    const el = new E();
    el.foo = 'foo1';
    container.appendChild(el);
    await el.updateComplete;
    assert.equal(el.foo, 'foo1');
    assert.equal(el.bar, 'defaultBar');
    assert.equal(el.getAttribute('foo'), 'foo1');
    assert.equal(el.getAttribute('bar'), 'defaultBar');
    assert.equal(el.updatedText, 'foo1-defaultBar');
    assert.equal(el._updateCount, 1);

    el.foo = 'foo2';
    el.bar = 'bar';
    await el.updateComplete;
    assert.equal(el.foo, 'foo2');
    assert.equal(el.bar, 'bar');
    assert.equal(el.getAttribute('foo'), 'foo2');
    assert.equal(el.getAttribute('bar'), 'bar');
    assert.equal(el.updatedText, 'foo2-bar');
    assert.equal(el._updateCount, 2);

    el.foo = 'foo3';
    await el.updateComplete;
    assert.equal(el.foo, 'foo3');
    assert.equal(el.getAttribute('foo'), 'foo3');
    assert.equal(el.getAttribute('bar'), 'bar');
    assert.equal(el.updatedText, 'foo3-bar');
    assert.equal(el._updateCount, 3);
  });

  test('user accessors can be extended', async () => {
    // Sup implements an accessor that clamps to a maximum in the setter
    class Sup extends ReactiveElement {
      _supSetCount?: number;
      _oldFoo?: any;
      _foo?: number;
      updatedText = '';
      static get properties() {
        return {foo: {type: Number}};
      }
      constructor() {
        super();
        this.foo = 0;
      }
      set foo(v: number) {
        this._supSetCount = (this._supSetCount || 0) + 1;
        const old = this.foo;
        this._foo = Math.min(v, 10);
        this.requestUpdate('foo', old);
      }
      get foo(): number {
        return this._foo as number;
      }
      update(changedProperties: PropertyValues) {
        this._oldFoo = changedProperties.get('foo');
        super.update(changedProperties);
      }
      updated() {
        this.updatedText = `${this.foo}`;
      }
    }
    customElements.define(generateElementName(), Sup);

    // Sub implements an accessor that rounds down in the getter
    class Sub extends Sup {
      _subSetCount?: number;
      static get properties() {
        return {foo: {type: Number}};
      }
      set foo(v: number) {
        this._subSetCount = (this._subSetCount || 0) + 1;
        super.foo = v;
      }
      get foo(): number {
        const v = super.foo;
        return v ? Math.floor(v) : v;
      }
    }
    customElements.define(generateElementName(), Sub);

    const sup = new Sup();
    container.appendChild(sup);
    await sup.updateComplete;
    assert.equal(sup.foo, 0);
    assert.equal(sup._oldFoo, undefined);
    assert.equal(sup._supSetCount, 1);
    assert.equal(sup.updatedText, '0');

    sup.foo = 5;
    await sup.updateComplete;
    assert.equal(sup.foo, 5);
    assert.equal(sup._oldFoo, 0);
    assert.equal(sup._supSetCount, 2);
    assert.equal(sup.updatedText, '5');

    sup.foo = 20;
    await sup.updateComplete;
    assert.equal(sup.foo, 10); // (user getter implements a max of 10)
    assert.equal(sup._oldFoo, 5);
    assert.equal(sup._supSetCount, 3);
    assert.equal(sup.updatedText, '10');

    sup.foo = 5;
    await sup.updateComplete;
    assert.equal(sup.foo, 5);
    assert.equal(sup._oldFoo, 10);
    assert.equal(sup._supSetCount, 4);
    assert.equal(sup.updatedText, '5');

    const sub = new Sub();
    container.appendChild(sub);
    await sub.updateComplete;
    assert.equal(sub.foo, 0);
    assert.equal(sub._oldFoo, undefined);
    assert.equal(sub._supSetCount, 1);
    assert.equal(sub._subSetCount, 1);
    assert.equal(sub.updatedText, '0');

    sub.foo = 5;
    await sub.updateComplete;
    assert.equal(sub.foo, 5);
    assert.equal(sub._oldFoo, 0);
    assert.equal(sub._supSetCount, 2);
    assert.equal(sub._subSetCount, 2);
    assert.equal(sub.updatedText, '5');

    sub.foo = 7.5;
    await sub.updateComplete;
    assert.equal(sub.foo, 7); // (sub setter rounds down)
    assert.equal(sub._oldFoo, 5);
    assert.equal(sub._supSetCount, 3);
    assert.equal(sub._subSetCount, 3);
    assert.equal(sub.updatedText, '7');

    sub.foo = 20;
    await sub.updateComplete;
    assert.equal(sub.foo, 10); // (super user getter maxes at 10)
    assert.equal(sub._oldFoo, 7);
    assert.equal(sub._supSetCount, 4);
    assert.equal(sub._subSetCount, 4);
    assert.equal(sub.updatedText, '10');
  });

  test('Using `noAccessor` to set property options for extended user accessors', async () => {
    // Sup implements an accessor that clamps to a maximum in the setter
    class Sup extends ReactiveElement {
      _supSetCount?: number;
      _oldFoo?: any;
      _foo?: number;
      updatedText = '';
      static get properties() {
        return {foo: {type: Number}};
      }
      constructor() {
        super();
        this.foo = 0;
      }
      set foo(v: number) {
        this._supSetCount = (this._supSetCount || 0) + 1;
        const old = this.foo;
        this._foo = Math.min(v, 10);
        this.requestUpdate('foo', old);
      }
      get foo(): number {
        return this._foo as number;
      }
      update(changedProperties: PropertyValues) {
        this._oldFoo = changedProperties.get('foo');
        super.update(changedProperties);
      }
      updated() {
        this.updatedText = `${this.foo}`;
      }
    }
    customElements.define(generateElementName(), Sup);

    // Sub implements an accessor that rounds down in the getter
    class Sub extends Sup {
      static get properties() {
        return {foo: {type: Number, reflect: true, noAccessor: true}};
      }
    }
    customElements.define(generateElementName(), Sub);

    const sub = new Sub();
    container.appendChild(sub);
    await sub.updateComplete;
    assert.equal(sub.foo, 0);
    assert.equal(sub._oldFoo, undefined);
    assert.equal(sub._supSetCount, 1);
    assert.equal(sub.updatedText, '0');

    sub.foo = 5;
    await sub.updateComplete;
    assert.equal(sub.foo, 5);
    assert.equal(sub._oldFoo, 0);
    assert.equal(sub._supSetCount, 2);
    assert.equal(sub.updatedText, '5');
    assert.equal(sub.getAttribute('foo'), '5');
  });

  test('can provide a default property declaration', async () => {
    const SpecialNumber = {};

    const myPropertyDeclaration = {
      type: SpecialNumber,
      reflect: true,
      converter: {
        toAttribute: function (value: unknown, type?: unknown): unknown {
          switch (type) {
            case String:
              return value === undefined ? null : value;
            default:
              return defaultConverter.toAttribute!(value, type);
          }
        },
        fromAttribute: function (value: string | null, type?: unknown) {
          switch (type) {
            case SpecialNumber:
              return Number(value) + 10;
            default:
              return defaultConverter.fromAttribute!(value, type);
          }
        },
      },
    };

    class E extends ReactiveElement {
      static createProperty(name: PropertyKey, options: PropertyDeclaration) {
        // Always mix into defaults to preserve custom converter.
        options = Object.assign(Object.create(myPropertyDeclaration), options);
        super.createProperty(name, options);
      }

      static properties = {foo: {}, bar: {type: String}};
      foo = 5;
      bar?: string = 'bar';
    }
    customElements.define(generateElementName(), E);

    const el = new E();
    container.appendChild(el);
    el.setAttribute('foo', '10');
    el.setAttribute('bar', 'attrBar');
    await el.updateComplete;
    assert.equal(el.foo, 20);
    assert.equal(el.bar, 'attrBar');
    el.foo = 5;
    el.bar = undefined;
    await el.updateComplete;
    assert.equal(el.getAttribute('foo'), '5');
    assert.isFalse(el.hasAttribute('bar'));
  });

  test('can customize property options and accessor creation', async () => {
    interface MyPropertyDeclarations {
      readonly [key: string]: MyPropertyDeclaration;
    }

    interface MyPropertyDeclaration<TypeHint = unknown>
      extends PropertyDeclaration {
      validator?: (value: any) => TypeHint;
      observer?: (oldValue: TypeHint) => void;
    }

    class E extends ReactiveElement {
      static getPropertyDescriptor(
        name: PropertyKey,
        key: string | symbol,
        options: MyPropertyDeclaration
      ) {
        const defaultDescriptor = super.getPropertyDescriptor(
          name,
          key,
          options
        );
        return {
          get: defaultDescriptor.get,
          set(this: E, value: unknown) {
            const oldValue = (this as unknown as {[key: string]: unknown})[
              name as string
            ];
            if (options.validator) {
              value = options.validator(value);
            }
            (this as unknown as {[key: string]: unknown})[key as string] =
              value;
            (this as unknown as ReactiveElement).requestUpdate(name, oldValue);
          },

          configurable: defaultDescriptor.configurable,
          enumerable: defaultDescriptor.enumerable,
        };
      }

      updated(changedProperties: PropertyValues) {
        super.updated(changedProperties);
        changedProperties.forEach((value: unknown, key: PropertyKey) => {
          const options = (
            this.constructor as typeof ReactiveElement
          ).getPropertyOptions(key) as MyPropertyDeclaration;
          const observer = options.observer;
          if (typeof observer === 'function') {
            observer.call(this, value);
          }
        });
      }

      foo = 5;
      bar = 'bar';

      _observedZot?: any;
      _observedZot2?: any;

      zot = '';
      zot2 = '';
      foo2 = 5;

      // custom typed properties
      static properties: MyPropertyDeclarations = {
        foo: {
          type: Number,
          validator: (value: number) => Math.min(10, Math.max(value, 0)),
        },
        bar: {},
        zot: {
          observer: function (this: E, oldValue: unknown) {
            this._observedZot = {value: this.zot, oldValue};
          },
        },
        // object cast as type
        zot2: {
          observer: function (this: E, oldValue: unknown) {
            this._observedZot2 = {value: this.zot2, oldValue};
          },
        } as PropertyDeclaration,
        // object satisfying defined custom type.
        foo2: {
          type: Number,
          validator: (value: number) => Math.min(10, Math.max(value, 0)),
        },
      };
    }
    customElements.define(generateElementName(), E);

    const el = new E();
    container.appendChild(el);
    await el.updateComplete;
    el.foo = 20;
    el.foo2 = 20;
    assert.equal(el.foo, 10);
    assert.equal(el.foo2, 10);
    assert.deepEqual(el._observedZot, {value: '', oldValue: undefined});
    assert.deepEqual(el._observedZot2, {value: '', oldValue: undefined});
    el.foo = -5;
    el.foo2 = -5;
    assert.equal(el.foo, 0);
    assert.equal(el.foo2, 0);
    el.bar = 'bar2';
    assert.equal(el.bar, 'bar2');
    el.zot = 'zot';
    el.zot2 = 'zot';
    await el.updateComplete;
    assert.deepEqual(el._observedZot, {value: 'zot', oldValue: ''});
    assert.deepEqual(el._observedZot2, {value: 'zot', oldValue: ''});
  });

  test('can customize properties to update synchronously', async () => {
    interface MyPropertyDeclaration extends PropertyDeclaration {
      sync: boolean;
    }

    class E extends ReactiveElement {
      static getPropertyDescriptor(
        name: PropertyKey,
        key: string | symbol,
        options: MyPropertyDeclaration
      ) {
        const defaultDescriptor = super.getPropertyDescriptor(
          name,
          key,
          options
        );
        const setter = defaultDescriptor.set;
        return Object.assign(defaultDescriptor, {
          set(this: E, value: unknown) {
            setter.call(this, value);
            if (options.sync && this.hasUpdated && !this.isUpdating) {
              (this as unknown as E).performUpdate();
            }
          },
        });
      }

      isUpdating = false;

      updateCount = 0;

      performUpdate() {
        // While it's dubious to have a computed property that's
        // also settable but this just demonstrates it's possible.
        this.isUpdating = true;
        super.performUpdate();
        this.isUpdating = false;
      }

      update(changedProperties: PropertyValues) {
        this.zug = this.foo + 1;
        super.update(changedProperties);
      }

      updated() {
        this.updateCount++;
      }

      static properties = {
        foo: {
          type: Number,
          sync: true,
          reflect: true,
        },
        zug: {type: Number, sync: true},
        bar: {},
      };

      foo = 5;
      zug = this.foo;
      bar = 'bar';
    }
    customElements.define(generateElementName(), E);

    const el = new E();
    container.appendChild(el);
    await el.updateComplete;
    el.foo = 10;
    assert.equal(el.updateCount, 2);
    el.foo = 1;
    el.foo = 2;
    assert.equal(el.updateCount, 4);
    el.foo = 3;
    await el.updateComplete;
    assert.equal(el.updateCount, 5);
    el.bar = 'bar2';
    assert.equal(el.updateCount, 5);
    await el.updateComplete;
    assert.equal(el.updateCount, 6);
    el.foo = 5;
    assert.equal(el.updateCount, 7);
    el.zug = 60;
    assert.equal(el.updateCount, 8);
  });

  test('attribute-based property storage', async () => {
    class E extends ReactiveElement {
      _updateCount = 0;
      updatedText = '';
      static get properties() {
        return {foo: {type: String}, bar: {type: String}};
      }
      set foo(value: string | null) {
        this.setAttribute('foo', value as string);
        this.requestUpdate();
      }
      get foo() {
        return this.getAttribute('foo') || 'defaultFoo';
      }
      set bar(value: string | null) {
        this.setAttribute('bar', value as string);
        this.requestUpdate();
      }
      get bar() {
        return this.getAttribute('bar') || 'defaultBar';
      }
      update(changedProperties: PropertyValues) {
        this._updateCount++;
        super.update(changedProperties);
      }
      updated() {
        this.updatedText = `${this.foo}-${this.bar}`;
      }
    }
    customElements.define(generateElementName(), E);

    const el = new E();
    el.foo = 'foo1';
    container.appendChild(el);
    await el.updateComplete;
    assert.equal(el.foo, 'foo1');
    assert.equal(el.bar, 'defaultBar');
    assert.equal(el.updatedText, 'foo1-defaultBar');
    assert.equal(el._updateCount, 1);

    el.foo = 'foo2';
    el.bar = 'bar';
    await el.updateComplete;
    assert.equal(el.foo, 'foo2');
    assert.equal(el.bar, 'bar');
    assert.equal(el.getAttribute('foo'), 'foo2');
    assert.equal(el.getAttribute('bar'), 'bar');
    assert.equal(el.updatedText, 'foo2-bar');
    assert.equal(el._updateCount, 2);

    el.foo = 'foo3';
    await el.updateComplete;
    assert.equal(el.foo, 'foo3');
    assert.equal(el.getAttribute('foo'), 'foo3');
    assert.equal(el.getAttribute('bar'), 'bar');
    assert.equal(el.updatedText, 'foo3-bar');
    assert.equal(el._updateCount, 3);
  });

  test('attributeChangedCallback-based updating', async () => {
    class E extends ReactiveElement {
      _updateCount = 0;
      updatedText = '';
      static get properties() {
        return {foo: {type: String}, bar: {type: String}};
      }
      set foo(value: string | null) {
        this.setAttribute('foo', value as string);
      }
      get foo() {
        return this.getAttribute('foo') || 'defaultFoo';
      }
      set bar(value: string | null) {
        this.setAttribute('bar', value as string);
      }
      get bar() {
        return this.getAttribute('bar') || 'defaultBar';
      }
      attributeChangedCallback(name: string, old: string, value: string) {
        super.attributeChangedCallback(name, old, value);
        this.requestUpdate(name, old);
      }
      update(changedProperties: PropertyValues) {
        this._updateCount++;
        super.update(changedProperties);
      }
      updated() {
        this.updatedText = `${this.foo}-${this.bar}`;
      }
    }
    customElements.define(generateElementName(), E);

    const el = new E();
    el.foo = 'foo1';
    container.appendChild(el);
    await el.updateComplete;
    assert.equal(el.foo, 'foo1');
    assert.equal(el.bar, 'defaultBar');
    assert.equal(el.updatedText, 'foo1-defaultBar');
    assert.equal(el._updateCount, 1);

    el.foo = 'foo2';
    el.bar = 'bar';
    await el.updateComplete;
    assert.equal(el.foo, 'foo2');
    assert.equal(el.bar, 'bar');
    assert.equal(el.getAttribute('foo'), 'foo2');
    assert.equal(el.getAttribute('bar'), 'bar');
    assert.equal(el.updatedText, 'foo2-bar');
    assert.equal(el._updateCount, 2);

    el.foo = 'foo3';
    await el.updateComplete;
    assert.equal(el.foo, 'foo3');
    assert.equal(el.getAttribute('foo'), 'foo3');
    assert.equal(el.getAttribute('bar'), 'bar');
    assert.equal(el.updatedText, 'foo3-bar');
    assert.equal(el._updateCount, 3);
  });

  test('setting properties in `updated` does trigger update and does not block updateComplete', async () => {
    class E extends ReactiveElement {
      static get properties() {
        return {foo: {}};
      }
      foo = 0;
      updateCount = 0;
      fooMax = 2;

      update(changed: PropertyValues) {
        this.updateCount++;
        super.update(changed);
      }

      updated() {
        if (this.foo < this.fooMax) {
          this.foo++;
        }
      }
    }
    customElements.define(generateElementName(), E);
    const el = new E();
    container.appendChild(el);
    let result = await el.updateComplete;
    assert.isFalse(result);
    assert.equal(el.foo, 1);
    assert.equal(el.updateCount, 1);
    result = await el.updateComplete;
    assert.isFalse(result);
    assert.equal(el.foo, 2);
    assert.equal(el.updateCount, 2);
    result = await el.updateComplete;
    assert.isTrue(result);
  });

  test('setting properties in `updated` can await until updateComplete returns true', async () => {
    class E extends ReactiveElement {
      static get properties() {
        return {foo: {}};
      }
      foo = 0;
      updateCount = 0;

      update(changed: PropertyValues) {
        this.updateCount++;
        super.update(changed);
      }

      updated() {
        if (this.foo < 10) {
          this.foo++;
        }
      }
    }
    customElements.define(generateElementName(), E);
    const el = new E();
    container.appendChild(el);
    // eslint-disable-next-line no-empty
    while (!(await el.updateComplete)) {}
    assert.equal(el.foo, 10);
  });

  test('`updateComplete` can block properties set in `updated`', async () => {
    class E extends ReactiveElement {
      static get properties() {
        return {foo: {}};
      }
      foo = 1;
      updateCount = 0;
      fooMax = 10;

      update(changed: PropertyValues) {
        this.updateCount++;
        super.update(changed);
      }

      updated() {
        if (this.foo < this.fooMax) {
          this.foo++;
        }
      }

      get updateComplete(): Promise<any> {
        return super.updateComplete.then((v) => v || this.updateComplete);
      }
    }
    customElements.define(generateElementName(), E);
    const el = new E();
    container.appendChild(el);
    const result = await el.updateComplete;
    assert.isTrue(result);
    assert.equal(el.foo, 10);
    assert.equal(el.updateCount, 10);
  });

  test('can await promise in `updateComplete`', async () => {
    class E extends ReactiveElement {
      static get properties() {
        return {foo: {}};
      }
      promiseFulfilled = false;

      get updateComplete() {
        return (async () => {
          return (
            (await super.updateComplete) &&
            (await new Promise<boolean>((resolve) => {
              setTimeout(() => {
                this.promiseFulfilled = true;
                resolve(true);
              }, 1);
            }))
          );
        })();
      }
    }
    customElements.define(generateElementName(), E);
    const el = new E();
    container.appendChild(el);
    const result = await el.updateComplete;
    assert.isTrue(result);
    assert.isTrue(el.promiseFulfilled);
  });

  test('can await sub-element `updateComplete`', async () => {
    class E extends ReactiveElement {
      static get properties() {
        return {foo: {}};
      }
      promiseFulfilled = false;
      foo = 'hi';
      updatedText = '';

      get updateComplete() {
        return super.updateComplete.then(
          () =>
            new Promise<boolean>((resolve) =>
              setTimeout(() => {
                this.promiseFulfilled = true;
                resolve(true);
              }, 1)
            )
        );
      }

      updated() {
        this.updatedText = this.foo;
      }
    }
    customElements.define('x-1224', E);

    class F extends ReactiveElement {
      inner: E | null = null;

      firstUpdated() {
        this.inner = document.createElement('x-1224') as E;
        this.renderRoot!.appendChild(this.inner);
      }

      get updateComplete() {
        return super.updateComplete.then(() => {
          this.inner!.foo = 'yo';
          return this.inner!.updateComplete;
        });
      }
    }
    customElements.define(generateElementName(), F);
    const el = new F();
    container.appendChild(el);
    const result = await el.updateComplete;
    assert.isTrue(result);
    assert.equal(el.inner!.updatedText, 'yo');
    assert.isTrue(el.inner!.promiseFulfilled);
  });

  test('properties set before upgrade are applied', async () => {
    const name = generateElementName();
    const el = document.createElement(name);
    container.appendChild(el);
    (el as any).foo = 'hi';
    (el as any).bar = false;
    const objectValue = {};
    (el as any).zug = objectValue;
    class E extends ReactiveElement {
      static get properties() {
        return {foo: {}, bar: {}, zug: {}};
      }

      foo = '';
      bar = true;
      zug = null;
    }
    customElements.define(name, E);
    await (el as ReactiveElement).updateComplete;
    assert.equal((el as any).foo, 'hi');
    assert.equal((el as any).bar, false);
    assert.equal((el as any).zug, objectValue);
  });

  test('can override performUpdate()', async () => {
    let resolve: ((value?: unknown) => void) | undefined;

    class A extends ReactiveElement {
      performUpdateCalled = false;
      updateCalled = false;

      async performUpdate() {
        this.performUpdateCalled = true;
        await new Promise((r) => (resolve = r));
        await super.performUpdate();
      }

      update(changedProperties: Map<PropertyKey, unknown>) {
        this.updateCalled = true;
        super.update(changedProperties);
      }
    }
    customElements.define(generateElementName(), A);

    const a = new A();
    container.appendChild(a);

    // update is not called synchronously
    assert.isFalse(a.updateCalled);

    // update is not called after a microtask
    await 0;
    assert.isFalse(a.updateCalled);

    // update is not called after a small amount of time
    await new Promise((r) => setTimeout(r, 10));
    assert.isFalse(a.updateCalled);

    // update is called after performUpdate allowed to complete
    resolve!();
    await a.updateComplete;
    assert.isTrue(a.updateCalled);
  });

  test('overriding performUpdate() allows nested invalidations', async () => {
    class A extends ReactiveElement {
      performUpdateCalledCount = 0;
      updatedCalledCount = 0;

      async performUpdate() {
        this.performUpdateCalledCount++;
        await new Promise((r) => setTimeout(r));
        super.performUpdate();
      }

      updated(_changedProperties: Map<PropertyKey, unknown>) {
        this.updatedCalledCount++;
        // trigger a nested invalidation just once
        if (this.updatedCalledCount === 1) {
          this.requestUpdate();
        }
      }
    }
    customElements.define(generateElementName(), A);

    const a = new A();
    container.appendChild(a);
    assert.equal(a.updatedCalledCount, 0);

    const updateComplete1 = a.updateComplete;
    await updateComplete1;
    assert.equal(a.updatedCalledCount, 1);
    assert.equal(a.performUpdateCalledCount, 1);

    const updateComplete2 = a.updateComplete;
    assert.notStrictEqual(updateComplete1, updateComplete2);

    await updateComplete2;
    assert.equal(a.updatedCalledCount, 2);
    assert.equal(a.performUpdateCalledCount, 2);
  });

  test('update does not occur before element is connected', async () => {
    class A extends ReactiveElement {
      updatedCalledCount = 0;

      static properties = {foo: {}};
      foo = 5;

      updated(_changedProperties: Map<PropertyKey, unknown>) {
        this.updatedCalledCount++;
      }
    }
    customElements.define(generateElementName(), A);
    const a = new A();
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(a.updatedCalledCount, 0);
    container.appendChild(a);
    await a.updateComplete;
    assert.equal(a.updatedCalledCount, 1);
  });

  test('early access of updateComplete waits until first update', async () => {
    class A extends ReactiveElement {
      didUpdate = false;

      updated(_changedProperties: Map<PropertyKey, unknown>) {
        this.didUpdate = true;
      }
    }
    customElements.define(generateElementName(), A);
    const a = new A();
    let updated = false;
    a.updateComplete.then(() => {
      updated = true;
      assert.isTrue(a.didUpdate);
    });
    await new Promise((r) => setTimeout(r, 20));
    assert.isFalse(updated);
    container.appendChild(a);
    await a.updateComplete;
    assert.isTrue(updated);
  });

  test('property reflects after setting attribute in same update cycle', async () => {
    class A extends ReactiveElement {
      foo?: boolean;
      bar?: string;

      static get properties() {
        return {
          foo: {type: Boolean, reflect: true},
          bar: {type: String, reflect: true},
        };
      }
    }
    customElements.define(generateElementName(), A);
    const a = new A();
    container.appendChild(a);
    a.setAttribute('foo', '');
    a.removeAttribute('foo');
    a.foo = true;
    await a.updateComplete;
    assert.isTrue(a.hasAttribute('foo'));
    a.setAttribute('bar', 'hi');
    a.bar = 'yo';
    await a.updateComplete;
    assert.equal(a.getAttribute('bar'), 'yo');
  });

  test('addInitializer', () => {
    class A extends ReactiveElement {
      prop1?: string;
      prop2?: string;
      event?: string;
    }
    A.addInitializer((a) => {
      (a as A).prop1 = 'prop1';
    });
    A.addInitializer((a) => {
      (a as A).prop2 = 'prop2';
    });
    A.addInitializer((a) => {
      a.addEventListener('click', (e) => ((a as A).event = e.type));
    });
    customElements.define(generateElementName(), A);
    const a = new A();
    container.appendChild(a);
    assert.equal(a.prop1, 'prop1');
    assert.equal(a.prop2, 'prop2');
    a.dispatchEvent(new Event('click'));
    assert.equal(a.event, 'click');
  });

  suite('exceptions', () => {
    let threwError = false;
    // Custom error listener.
    const errorListener = (e: Event) => {
      threwError = true;
      e.preventDefault();
    };
    // Squelch console errors as it seems to mess up the test runner.
    const consoleError = console.error;
    suiteSetup(() => {
      console.error = () => {};
      window.addEventListener('unhandledrejection', errorListener);
    });

    suiteTeardown(() => {
      console.error = consoleError;
      window.removeEventListener('unhandledrejection', errorListener);
    });

    let container: HTMLElement;

    const isIE = /Trident/.test(navigator.userAgent);

    const errorsThrown = async () => {
      await nextFrame();
      // Note, should be done by rAF, but FF/IE appears to need more time.
      await new Promise((r) => setTimeout(r, isIE ? 50 : 0));
    };

    setup(() => {
      threwError = false;
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    teardown(async () => {
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
      await errorsThrown();
    });

    test('exceptions in `update` do not prevent further updates', async () => {
      let shouldThrow = false;
      class A extends ReactiveElement {
        static properties = {foo: {}};
        foo = 5;
        updatedFoo = 0;

        update(changedProperties: Map<PropertyKey, unknown>) {
          if (shouldThrow) {
            throw new Error('test error');
          }
          super.update(changedProperties);
        }

        updated(_changedProperties: Map<PropertyKey, unknown>) {
          this.updatedFoo = this.foo;
        }
      }
      customElements.define(generateElementName(), A);
      const a = new A();
      container.appendChild(a);
      await a.updateComplete;
      assert.equal(a.updatedFoo, 5);
      shouldThrow = true;
      a.foo = 10;
      let threw = false;
      try {
        await a.updateComplete;
      } catch (e) {
        threw = true;
      }
      assert.isTrue(threw);
      assert.equal(a.foo, 10);
      assert.equal(a.updatedFoo, 5);
      shouldThrow = false;
      a.foo = 20;
      await a.updateComplete;
      assert.equal(a.foo, 20);
      assert.equal(a.updatedFoo, 20);
    });

    test('exceptions in `update` prevent `firstUpdated` and `updated` from being called', async () => {
      let shouldThrow = false;
      class A extends ReactiveElement {
        firstUpdatedCalled = false;
        updatedCalled = false;

        update(changedProperties: Map<PropertyKey, unknown>) {
          if (shouldThrow) {
            throw new Error('test error');
          }
          super.update(changedProperties);
        }

        firstUpdated() {
          this.firstUpdatedCalled = true;
        }

        updated(_changedProperties: Map<PropertyKey, unknown>) {
          this.updatedCalled = true;
        }
      }
      customElements.define(generateElementName(), A);
      shouldThrow = true;
      const a = new A();
      container.appendChild(a);
      let threw = false;
      try {
        await a.updateComplete;
      } catch (e) {
        threw = true;
      }
      assert.isTrue(threw);
      assert.isFalse(a.firstUpdatedCalled);
      assert.isFalse(a.updatedCalled);
      shouldThrow = false;
      a.requestUpdate();
      await a.updateComplete;
      assert.isTrue(a.firstUpdatedCalled);
      assert.isTrue(a.updatedCalled);
    });

    test('exceptions in `shouldUpdate` do not prevent further updates', async () => {
      let shouldThrow = false;
      class A extends ReactiveElement {
        static properties = {foo: {}};
        foo = 5;
        updatedFoo = 0;

        shouldUpdate(changedProperties: Map<PropertyKey, unknown>) {
          if (shouldThrow) {
            throw new Error('test error');
          }
          return super.shouldUpdate(changedProperties);
        }

        updated(_changedProperties: Map<PropertyKey, unknown>) {
          this.updatedFoo = this.foo;
        }
      }
      customElements.define(generateElementName(), A);
      const a = new A();
      container.appendChild(a);
      await a.updateComplete;
      assert.equal(a.updatedFoo, 5);
      shouldThrow = true;
      a.foo = 10;
      let threw = false;
      try {
        await a.updateComplete;
      } catch (e) {
        threw = true;
      }
      assert.isTrue(threw);
      assert.equal(a.foo, 10);
      assert.equal(a.updatedFoo, 5);
      shouldThrow = false;
      a.foo = 20;
      await a.updateComplete;
      assert.equal(a.foo, 20);
      assert.equal(a.updatedFoo, 20);
    });

    test('exceptions in `updated` do not prevent further or re-entrant updates', async () => {
      let shouldThrow = false;
      let enqueue = false;
      class A extends ReactiveElement {
        static properties = {foo: {}};
        foo = 5;
        updatedFoo = 0;

        changedProps?: PropertyValues;

        updated(_changedProperties: Map<PropertyKey, unknown>) {
          if (enqueue) {
            enqueue = false;
            this.foo++;
          }
          if (shouldThrow) {
            shouldThrow = false;
            throw new Error('test error');
          }
          this.changedProps = _changedProperties;
          this.updatedFoo = this.foo;
        }

        get updateComplete(): Promise<any> {
          return super.updateComplete.then((v) => v || this.updateComplete);
        }
      }
      customElements.define(generateElementName(), A);
      const a = new A();
      container.appendChild(a);
      await a.updateComplete;
      assert.equal(a.updatedFoo, 5);
      shouldThrow = true;
      a.changedProps = new Map();
      a.foo = 10;
      let threw = false;
      try {
        await a.updateComplete;
      } catch (e) {
        threw = true;
      }
      assert.isTrue(threw);
      assert.isFalse(a.changedProps.has('foo'));
      assert.equal(a.foo, 10);
      assert.equal(a.updatedFoo, 5);
      a.foo = 20;
      await a.updateComplete;
      assert.equal(a.changedProps.get('foo'), 10);
      assert.equal(a.foo, 20);
      assert.equal(a.updatedFoo, 20);
      enqueue = true;
      shouldThrow = true;
      a.foo = 50;
      threw = false;
      try {
        await a.updateComplete;
      } catch (e) {
        threw = true;
      }
      assert.isTrue(threw);
      assert.equal(a.changedProps.get('foo'), 50);
      assert.equal(a.foo, 51);
      assert.equal(a.updatedFoo, 51);
    });

    test('exceptions in `performUpdate` do not prevent further updates', async () => {
      let shouldThrow = false;
      class A extends ReactiveElement {
        static properties = {foo: {}};
        foo = 5;
        updatedFoo = 0;

        updated(_changedProperties: Map<PropertyKey, unknown>) {
          this.updatedFoo = this.foo;
        }

        performUpdate() {
          return new Promise<void>((resolve, reject) => {
            super.performUpdate();
            if (shouldThrow) {
              reject();
            } else {
              resolve();
            }
          });
        }
      }
      customElements.define(generateElementName(), A);
      const a = new A();
      container.appendChild(a);
      await a.updateComplete;
      assert.equal(a.updatedFoo, 5);
      shouldThrow = true;
      a.foo = 10;
      let threw = false;
      try {
        await a.updateComplete;
      } catch (e) {
        threw = true;
      }
      assert.isTrue(threw);
      assert.equal(a.foo, 10);
      assert.equal(a.updatedFoo, 10);
      shouldThrow = false;
      a.foo = 20;
      await a.updateComplete;
      assert.equal(a.foo, 20);
      assert.equal(a.updatedFoo, 20);
    });

    test('exceptions in the update cycle are visible via window event', async () => {
      let shouldThrow = false;
      class A extends ReactiveElement {
        static properties = {foo: {}};
        foo = 5;
        updateCount = 0;

        updated(_changedProperties: Map<PropertyKey, unknown>) {
          this.updateCount++;
          if (shouldThrow) {
            // This will queue another update that must await this update
            // completing, and this update will error. That error will
            // fire async and be observable via the `unhandledrejection` event.
            this.requestUpdate();
            shouldThrow = false;
            throw new Error('Exception during update');
          }
        }
      }
      customElements.define(generateElementName(), A);
      const a = new A();
      container.appendChild(a);
      await a.updateComplete;
      assert.equal(a.updateCount, 1);
      // next update only will throw
      shouldThrow = true;
      a.foo = 10;
      await errorsThrown();
      assert.isTrue(threwError);
      assert.equal(a.foo, 10);
      assert.equal(a.updateCount, 3);
      // subsequent update that does not error proceeds normally
      a.foo = 15;
      await a.updateComplete;
      assert.equal(a.updateCount, 4);
    });
  });

  suite('disconnection handling', () => {
    let el: El;
    let updated: boolean;

    class El extends ReactiveElement {
      static properties = {foo: {}};
      foo = 5;

      update(_changedProperties: Map<PropertyKey, unknown>) {
        super.update(_changedProperties);
        updated = true;
      }
    }
    customElements.define(generateElementName(), El);

    setup(() => {
      updated = false;
      el = new El();
    });

    teardown(() => {
      if (el.isConnected) {
        container.removeChild(el);
      }
    });

    test('disconnect then requestUpdate', async () => {
      // Connect
      container.appendChild(el);
      assert.isFalse(updated);
      await nextFrame();
      assert.isTrue(updated);
      // Disconnect, then requestUpdate
      updated = false;
      container.removeChild(el);
      assert.isFalse(updated);
      el.foo++;
      await nextFrame();
      assert.isFalse(updated);
      // Re-connect
      container.appendChild(el);
      assert.isFalse(updated);
      await nextFrame();
      assert.isTrue(updated);
      // Resume normal updates
      updated = false;
      el.foo++;
      await nextFrame();
      assert.isTrue(updated);
    });

    test('requestUpdate then disconnect', async () => {
      // Connect
      container.appendChild(el);
      assert.isFalse(updated);
      await nextFrame();
      assert.isTrue(updated);
      // requestUpdate, then disconnect
      updated = false;
      el.foo++;
      container.removeChild(el);
      assert.isFalse(updated);
      await nextFrame();
      assert.isFalse(updated);
      // Re-connect
      container.appendChild(el);
      assert.isFalse(updated);
      await nextFrame();
      assert.isTrue(updated);
      // Resume normal updates
      updated = false;
      el.foo++;
      await nextFrame();
      assert.isTrue(updated);
    });

    test('requestUpdate, then disconnect and immediately reconnect', async () => {
      // Connect
      container.appendChild(el);
      assert.isFalse(updated);
      await nextFrame();
      assert.isTrue(updated);
      // requestUpdate, then disconnect + reconnect
      updated = false;
      el.foo++;
      container.removeChild(el);
      assert.isFalse(updated);
      container.appendChild(el);
      assert.isFalse(updated);
      await nextFrame();
      assert.isTrue(updated);
      // Resume normal updates
      updated = false;
      el.foo++;
      await nextFrame();
      assert.isTrue(updated);
    });

    test('thrash disconnection', async () => {
      // Connect
      container.appendChild(el);
      assert.isFalse(updated);
      await nextFrame();
      assert.isTrue(updated);
      // requestUpdate, then disconnect + reconnect + disconnect
      updated = false;
      el.foo++;
      container.removeChild(el);
      assert.isFalse(updated);
      container.appendChild(el);
      assert.isFalse(updated);
      container.removeChild(el);
      await nextFrame();
      // still no update: reconnect + disconnect
      assert.isFalse(updated);
      container.appendChild(el);
      assert.isFalse(updated);
      container.removeChild(el);
      await nextFrame();
      // still no update: reconnect
      assert.isFalse(updated);
      container.appendChild(el);
      await nextFrame();
      assert.isTrue(updated);
      // Resume normal updates
      updated = false;
      el.foo++;
      await nextFrame();
      assert.isTrue(updated);
    });

    test('connect and immediately disconnect before first update', async () => {
      // Connect and disconnect
      container.appendChild(el);
      container.removeChild(el);
      assert.isFalse(updated);
      await nextFrame();
      assert.isFalse(updated);
      // Re-connect
      container.appendChild(el);
      assert.isFalse(updated);
      await nextFrame();
      assert.isTrue(updated);
      // Resume normal updates
      updated = false;
      el.foo++;
      await nextFrame();
      assert.isTrue(updated);
    });
  });

  suite('customizing observedAttributes', () => {
    test('does not interfere with properties', () => {
      class E extends ReactiveElement {
        static properties = {
          foo: {},
          bar: {},
        };

        static get observedAttributes() {
          // Note, `finalize` must be called when not supering to observedAttributes
          this.finalize();
          return ['custom'];
        }
      }
      assert.doesNotThrow(() => {
        customElements.define(generateElementName(), E);
      });
      const el = new E();
      container.appendChild(el);
      const ctor = el.constructor as typeof ReactiveElement;
      assert.deepEqual(ctor.observedAttributes, ['custom']);
      assert.deepEqual(Array.from(ctor.elementProperties!.keys()), [
        'foo',
        'bar',
      ]);
    });

    test('using super on base class', () => {
      class E extends ReactiveElement {
        static get observedAttributes() {
          return ['foo', ...super.observedAttributes];
        }
      }
      assert.doesNotThrow(() => {
        customElements.define(generateElementName(), E);
      });
      const el = new E();
      container.appendChild(el);
      assert.deepEqual(
        (el.constructor as typeof ReactiveElement).observedAttributes,
        ['foo']
      );
    });

    test('using superclass properties', () => {
      class S extends ReactiveElement {
        static properties = {
          foo: {},
          bar: {},
        };
      }
      class E extends S {
        static get observedAttributes() {
          return ['custom', ...super.observedAttributes];
        }
      }
      assert.doesNotThrow(() => {
        customElements.define(generateElementName(), E);
      });
      const el = new E();
      container.appendChild(el);
      assert.deepEqual(
        (el.constructor as typeof ReactiveElement).observedAttributes,
        ['custom', 'foo', 'bar']
      );
    });

    test('using mixin, calling super.observedAttributes', () => {
      type Constructor<T> = {new (...args: any[]): T};
      function MyMixin<
        B extends Constructor<
          HTMLElement & {
            attributeChangedCallback?(
              name: string,
              oldVal: string,
              newVal: string
            ): void;
          }
        > & {
          observedAttributes?: string[];
        }
      >(superclass: B) {
        class E extends superclass {
          static get observedAttributes(): string[] {
            return [...(super.observedAttributes ?? []), 'custom'];
          }

          constructor(...a: any[]) {
            super(...a);
          }

          attrValue = '';

          attributeChangedCallback(
            name: string,
            oldVal: string,
            newVal: string
          ): void {
            if (
              !(
                super.constructor as typeof ReactiveElement
              ).observedAttributes?.includes?.(name)
            ) {
              this.attrValue = name;
            }
            super.attributeChangedCallback?.(name, oldVal, newVal);
          }
        }

        return E;
      }
      const E = MyMixin(ReactiveElement as any);
      assert.doesNotThrow(() => {
        customElements.define(generateElementName(), E);
      });
      const el = new E();
      container.appendChild(el);
      assert.deepEqual(
        (el.constructor as typeof ReactiveElement).observedAttributes,
        ['custom']
      );

      class F extends ReactiveElement {
        static properties: PropertyDeclarations = {
          foo: {},
          bar: {},
        };
      }

      const FE = MyMixin(F);
      assert.doesNotThrow(() => {
        customElements.define(generateElementName(), FE);
      });
      const el2 = new FE();
      container.appendChild(el2);
      const ctor = el2.constructor as typeof ReactiveElement;
      assert.deepEqual((ctor as typeof ReactiveElement).observedAttributes, [
        'foo',
        'bar',
        'custom',
      ]);
      assert.deepEqual(Array.from(ctor.elementProperties!.keys()), [
        'foo',
        'bar',
      ]);
      el2.setAttribute('custom', 'custom');
      assert.equal(el2.attrValue, 'custom');
      el2.setAttribute('foo', 'foo');
      assert.equal(el2.attrValue, 'custom');

      class GE extends FE {
        static properties: PropertyDeclarations = {
          zot: {},
          nug: {},
        };
      }
      assert.doesNotThrow(() => {
        customElements.define(generateElementName(), GE);
      });
      const el3 = new GE();
      container.appendChild(el3);
      const ctor3 = el3.constructor as typeof ReactiveElement;
      assert.deepEqual((ctor3 as typeof ReactiveElement).observedAttributes, [
        'foo',
        'bar',
        'zot',
        'nug',
        'custom',
      ]);
      assert.deepEqual(Array.from(ctor3.elementProperties!.keys()), [
        'foo',
        'bar',
        'zot',
        'nug',
      ]);
      el3.setAttribute('custom', 'custom');
      assert.equal(el3.attrValue, 'custom');
      el3.setAttribute('foo', 'foo');
      assert.equal(el3.attrValue, 'custom');
    });

    test('using mixin, calling superclass.observedAttributes directly', () => {
      type Constructor<T> = {new (...args: any[]): T};
      function MyMixin<
        B extends Constructor<
          HTMLElement & {
            attributeChangedCallback?(
              name: string,
              oldVal: string,
              newVal: string
            ): void;
          }
        > & {
          observedAttributes?: string[];
        }
      >(superclass: B) {
        class E extends superclass {
          static get observedAttributes(): string[] {
            return [...(superclass.observedAttributes ?? []), 'custom'];
          }

          constructor(...a: any[]) {
            super(...a);
          }

          attrValue = '';

          attributeChangedCallback(
            name: string,
            oldVal: string,
            newVal: string
          ): void {
            if (!superclass.observedAttributes?.includes?.(name)) {
              this.attrValue = name;
            }
            super.attributeChangedCallback?.(name, oldVal, newVal);
          }
        }

        return E;
      }
      const E = MyMixin(ReactiveElement as any);
      assert.doesNotThrow(() => {
        customElements.define(generateElementName(), E);
      });
      const el = new E();
      container.appendChild(el);
      assert.deepEqual(
        (el.constructor as typeof ReactiveElement).observedAttributes,
        ['custom']
      );

      class F extends ReactiveElement {
        static properties: PropertyDeclarations = {
          foo: {},
          bar: {},
        };
      }

      const FE = MyMixin(F);
      assert.doesNotThrow(() => {
        customElements.define(generateElementName(), FE);
      });
      const el2 = new FE();
      container.appendChild(el2);
      const ctor2 = el2.constructor as typeof ReactiveElement;
      assert.deepEqual((ctor2 as typeof ReactiveElement).observedAttributes, [
        'foo',
        'bar',
        'custom',
      ]);
      assert.deepEqual(Array.from(ctor2.elementProperties!.keys()), [
        'foo',
        'bar',
      ]);
      el2.setAttribute('custom', 'custom');
      assert.equal(el2.attrValue, 'custom');
      el2.setAttribute('foo', 'foo');
      assert.equal(el2.attrValue, 'custom');
    });
  });
});
