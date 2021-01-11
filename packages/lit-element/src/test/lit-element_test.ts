/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {
  html,
  LitElement,
  UpdatingElement,
  ReactiveElement,
} from '../lit-element.js';
import {
  directive,
  DisconnectableDirective,
} from 'lit-html/disconnectable-directive.js';
import {
  canTestLitElement,
  generateElementName,
  nextFrame,
  stripExpressionComments,
  wrap,
  shadowRoot,
} from './test-helpers.js';
import {assert} from '@esm-bundle/chai';

import {createRef, ref} from 'lit-html/directives/ref.js';

(canTestLitElement ? suite : suite.skip)('LitElement', () => {
  let container: HTMLElement;

  setup(() => {
    container = document.createElement('div');
    wrap(document.body).appendChild(container);
  });

  teardown(() => {
    if (container && wrap(container).parentNode) {
      wrap(wrap(container).parentNode as Element).removeChild(container);
    }
  });

  const enableElement = (e: string | HTMLElement) => {
    const el = typeof e === 'string' ? document.createElement(e) : e;
    wrap(container).appendChild(el);
    return el;
  };

  test('renders initial content into shadowRoot', async () => {
    const rendered = `hello world`;
    const name = generateElementName();
    customElements.define(
      name,
      class extends LitElement {
        render() {
          return html`${rendered}`;
        }
      }
    );
    const el = enableElement(name);
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        assert.ok(shadowRoot(el));
        assert.equal(
          stripExpressionComments(shadowRoot(el)!.innerHTML),
          rendered
        );
        resolve();
      });
    });
  });

  test('can set render target to light dom', async () => {
    const rendered = `hello world`;
    const name = generateElementName();
    customElements.define(
      name,
      class extends LitElement {
        render() {
          return html`${rendered}`;
        }

        createRenderRoot() {
          return this;
        }
      }
    );
    const el = enableElement(name);
    await (el as LitElement).updateComplete;
    assert.notOk(shadowRoot(el));
    assert.equal(stripExpressionComments(el.innerHTML), rendered);
  });

  test('renders when created via constructor', async () => {
    const rendered = `hello world`;
    class E extends LitElement {
      render() {
        return html`${rendered}`;
      }
    }
    customElements.define(generateElementName(), E);
    const el = enableElement(new E()) as E;
    await el.updateComplete;
    assert.ok(shadowRoot(el));
    assert.equal(stripExpressionComments(shadowRoot(el)!.innerHTML), rendered);
  });

  test('updates/renders attributes, properties, and event listeners via `lit-html`', async () => {
    class E extends LitElement {
      _event?: Event;

      render() {
        const attr = 'attr';
        const prop = 'prop';
        const event = function (this: E, e: Event) {
          this._event = e;
        };
        return html`<div attr="${attr}" .prop="${prop}" @zug="${event}"></div>`;
      }
    }
    customElements.define(generateElementName(), E);
    const el = enableElement(new E()) as E;
    await el.updateComplete;
    const d = shadowRoot(el)!.querySelector('div')!;
    assert.equal(d.getAttribute('attr'), 'attr');
    assert.equal((d as any).prop, 'prop');
    const e = new Event('zug');
    d.dispatchEvent(e);
    assert.equal(el._event, e);
  });

  test('event listeners are invoked with the right `this` value', async () => {
    class E extends LitElement {
      event?: Event;

      render() {
        return html`<div @test=${this.onTest}></div>`;
      }

      onTest(e: Event) {
        this.event = e;
      }
    }
    customElements.define(generateElementName(), E);
    const el = enableElement(new E()) as E;
    await el.updateComplete;
    const div = shadowRoot(el)!.querySelector('div')!;
    const event = new Event('test');
    div.dispatchEvent(event);
    assert.equal(el.event, event);
  });

  test('can set properties and attributes on sub-element', async () => {
    class E extends LitElement {
      static get properties() {
        return {foo: {}, attr: {}, bool: {type: Boolean}};
      }
      foo = 'hi';
      bool = false;

      render() {
        return html`${this.foo}`;
      }
    }
    customElements.define('x-2448', E);

    class F extends LitElement {
      inner: E | null = null;

      static get properties() {
        return {bar: {}, bool: {type: Boolean}};
      }
      bar = 'outer';
      bool = false;

      render() {
        return html`<x-2448
          .foo="${this.bar}"
          attr="${this.bar}"
          .bool="${this.bool}"
        ></x-2448>`;
      }

      firstUpdated() {
        this.inner = shadowRoot(this)!.querySelector('x-2448');
      }

      get updateComplete() {
        return super.updateComplete.then(() => this.inner!.updateComplete);
      }
    }
    customElements.define(generateElementName(), F);
    const el = enableElement(new F()) as F;
    await el.updateComplete;
    assert.equal(shadowRoot(el.inner!).textContent, 'outer');
    assert.equal((el.inner! as any).attr, 'outer');
    assert.equal(el.inner!.getAttribute('attr'), 'outer');
    assert.equal(el.inner!.bool, false);
    el.bar = 'test';
    el.bool = true;
    await el.updateComplete;
    assert.equal(shadowRoot(el.inner!).textContent, 'test');
    assert.equal((el.inner! as any).attr, 'test');
    assert.equal(el.inner!.getAttribute('attr'), 'test');
    assert.equal(el.inner!.bool, true);
  });

  test('adds a version number', () => {
    assert.equal(window['litElementVersions'].length, 1);
  });

  test('event fired during rendering element can trigger an update', async () => {
    class E extends LitElement {
      connectedCallback() {
        super.connectedCallback();
        this.dispatchEvent(
          new CustomEvent('foo', {bubbles: true, detail: 'foo'})
        );
      }
    }
    customElements.define('x-child-61012', E);

    class F extends LitElement {
      static get properties() {
        return {foo: {type: String}};
      }

      foo = '';

      render() {
        return html`<x-child-61012 @foo=${this._handleFoo}></x-child-61012
          ><span>${this.foo}</span>`;
      }

      _handleFoo(e: CustomEvent) {
        this.foo = e.detail;
      }
    }

    customElements.define(generateElementName(), F);
    const el = enableElement(new F()) as F;
    // eslint-disable-next-line no-empty
    while (!(await el.updateComplete)) {}
    assert.equal(shadowRoot(el)!.textContent, 'foo');
  });

  test('exceptions in `render` throw but do not prevent further updates', async () => {
    // TODO(sorvell): console errors produced by wtr and upset it.
    const consoleError = console.error;
    console.error = () => {};
    let shouldThrow = false;
    class A extends LitElement {
      static properties = {foo: {}};
      foo = 5;
      updatedFoo = 0;

      render() {
        if (shouldThrow) {
          throw new Error('test error');
        }
        return html`${this.foo}`;
      }
    }
    customElements.define(generateElementName(), A);
    const a = enableElement(new A()) as A;
    await a.updateComplete;
    assert.equal(shadowRoot(a).textContent, '5');
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
    assert.equal(shadowRoot(a).textContent, '5');
    shouldThrow = false;
    a.foo = 20;
    // TODO(sorvell): Make sure to wait beyond error timing or wtr is sad.
    await new Promise((r) => setTimeout(r));
    assert.equal(a.foo, 20);
    assert.equal(shadowRoot(a).textContent, '20');
    console.error = consoleError;
  });

  test('if `render` is unimplemented, do not overwrite renderRoot', async () => {
    class A extends LitElement {
      addedDom: HTMLElement | null = null;
      createRenderRoot() {
        return this;
      }
    }
    customElements.define(generateElementName(), A);
    const a = new A();
    const testDom = document.createElement('div');
    wrap(a).appendChild(testDom);
    wrap(container).appendChild(a);
    await a.updateComplete;
    assert.equal(
      testDom.parentNode,
      a,
      'testDom should be a child of the component'
    );
  });

  test('can use ReactiveElement', async () => {
    class A extends ReactiveElement {}
    customElements.define(generateElementName(), A);
    const a = enableElement(new A()) as A;
    await a.updateComplete;
    assert.ok(a.hasUpdated);
  });

  test('can use UpdatingElement', async () => {
    class A extends UpdatingElement {}
    customElements.define(generateElementName(), A);
    const a = enableElement(new A()) as A;
    await a.updateComplete;
    assert.ok(a.hasUpdated);
  });

  (window.ShadyDOM && window.ShadyDOM.inUse ? test.skip : test)(
    'can customize shadowRootOptions',
    async () => {
      class A extends LitElement {
        static shadowRootOptions: ShadowRootInit = {mode: 'closed'};
      }
      customElements.define(generateElementName(), A);
      const a = enableElement(new A()) as A;
      await a.updateComplete;
      assert.equal(shadowRoot(a), undefined);
    }
  );

  suite('disconnection handling', () => {
    let host: Host;
    const log: string[] = [];

    const d = directive(
      class extends DisconnectableDirective {
        id!: unknown;
        render(id: unknown) {
          log.push(`render-${id}`);
          return (this.id = id);
        }
        disconnectedCallback() {
          log.push(`disconnect-${this.id}`);
        }
        reconnectedCallback() {
          log.push(`reconnect-${this.id}`);
        }
      }
    );

    class Child extends LitElement {
      static properties = {
        attr: {type: String},
        prop: {type: String},
      };
      attr = 'default';
      prop = 'default';
      render() {
        return html`<div attr=${d('child-attr')} .prop=${d('child-prop')}>
          ${d('child-node')}
        </div>`;
      }
      get child() {
        // Cast to child so we can access .prop off of the div
        return shadowRoot(this)!.firstElementChild as Child;
      }
    }
    customElements.define('disc-child', Child);

    class Host extends LitElement {
      render() {
        return html`<disc-child attr=${d('host-attr')} .prop=${d('host-prop')}
          >${d('host-node')}</disc-child
        >`;
      }
      get child() {
        // Cast to child so we can access .prop off of the div
        return shadowRoot(this)!.firstElementChild as Child;
      }
    }
    customElements.define('disc-host', Host);

    const assertRendering = (host: Host) => {
      let child = host.child;
      let wrappedChild = wrap(child) as Element;
      assert.equal(wrappedChild.getAttribute('attr'), 'host-attr');
      assert.equal(child.prop, 'host-prop');
      assert.equal(wrappedChild.textContent?.trim(), 'host-node');
      child = child.child;
      wrappedChild = wrap(child) as Element;
      assert.equal(wrappedChild.getAttribute('attr'), 'child-attr');
      assert.equal(child.prop, 'child-prop');
      assert.equal(wrappedChild.textContent?.trim(), 'child-node');
    };

    setup(() => {
      log.length = 0;
      host = new Host();
    });

    teardown(() => {
      if (host.isConnected) {
        wrap(container).removeChild(host);
      }
    });

    test('directives render on connection', async () => {
      wrap(container).appendChild(host);
      await nextFrame();
      assertRendering(host);
      assert.deepEqual(log, [
        'render-host-attr',
        'render-host-prop',
        'render-host-node',
        'render-child-attr',
        'render-child-prop',
        'render-child-node',
      ]);
    });

    test('directives disconnect on disconnection', async () => {
      wrap(container).appendChild(host);
      await nextFrame();
      assertRendering(host);
      log.length = 0;
      wrap(container).removeChild(host);
      assertRendering(host);
      // Note: directive disconnection/reconnection is synchronous to
      // connected/disconnectedCallback
      assert.deepEqual(log, [
        'disconnect-host-attr',
        'disconnect-host-prop',
        'disconnect-host-node',
        'disconnect-child-attr',
        'disconnect-child-prop',
        'disconnect-child-node',
      ]);
    });

    test('directives reconnect on reconnection', async () => {
      wrap(container).appendChild(host);
      await nextFrame();
      assertRendering(host);
      wrap(container).removeChild(host);
      log.length = 0;
      wrap(container).appendChild(host);
      assertRendering(host);
      assert.deepEqual(log, [
        'reconnect-host-attr',
        'reconnect-host-prop',
        'reconnect-host-node',
        'reconnect-child-attr',
        'reconnect-child-prop',
        'reconnect-child-node',
      ]);
    });

    test('directives reconnect on reconnection', async () => {
      wrap(container).appendChild(host);
      await nextFrame();
      assertRendering(host);
      wrap(container).removeChild(host);
      await nextFrame();
      log.length = 0;
      wrap(container).appendChild(host);
      await nextFrame();
      assertRendering(host);
      assert.deepEqual(log, [
        'reconnect-host-attr',
        'reconnect-host-prop',
        'reconnect-host-node',
        'reconnect-child-attr',
        'reconnect-child-prop',
        'reconnect-child-node',
      ]);
    });

    test('directives reconnect and render on reconnection with pending render', async () => {
      wrap(container).appendChild(host);
      await nextFrame();
      assertRendering(host);
      wrap(container).removeChild(host);
      log.length = 0;
      host.requestUpdate();
      host.child.requestUpdate();
      wrap(container).appendChild(host);
      assertRendering(host);
      assert.deepEqual(log, [
        'reconnect-host-attr',
        'reconnect-host-prop',
        'reconnect-host-node',
        'reconnect-child-attr',
        'reconnect-child-prop',
        'reconnect-child-node',
      ]);
      log.length = 0;
      await nextFrame();
      assertRendering(host);
      assert.deepEqual(log, [
        'render-host-attr',
        'render-host-prop',
        'render-host-node',
        'render-child-attr',
        'render-child-prop',
        'render-child-node',
      ]);
    });
  });

  test('bind refs between elements', async () => {
    class RefChild extends LitElement {
      static properties = {
        bool: {},
        ref: {},
      };
      bool = false;
      // default ref, should be unused
      ref = createRef();
      cb = (_el: Element | undefined) => {};
      render() {
        return html` <span>
          ${this.bool
            ? html`<div id="true" ${ref(this.ref)} ${ref(this.cb)}></div>`
            : html`<div id="false" ${ref(this.ref)} ${ref(this.cb)}></div>`}
        </span>`;
      }
      get trueDiv() {
        return shadowRoot(this)!.querySelector('#true');
      }
      get falseDiv() {
        return shadowRoot(this)!.querySelector('#false');
      }
    }
    customElements.define('ref-child', RefChild);

    class RefHost extends LitElement {
      static properties = {
        bool: {type: Boolean},
      };
      bool = false;
      elRef = createRef();
      el: Element | undefined;
      count = 0;
      elCallback = (el: Element | undefined) => {
        this.count++;
        this.el = el;
      };
      render() {
        return html`<ref-child
          .bool=${this.bool}
          .ref=${this.elRef}
          .cb=${this.elCallback}
        ></ref-child>`;
      }
      get child() {
        return shadowRoot(this)!.querySelector('ref-child') as RefChild;
      }
    }
    customElements.define('x-host', RefHost);

    const host = wrap(container).appendChild(new RefHost());
    await host.updateComplete;
    await host.child.updateComplete;
    assert.equal(host.el, host.child.falseDiv);
    assert.equal(host.elRef.value, host.child.falseDiv);
    assert.equal(host.count, 1);

    host.requestUpdate();
    await host.updateComplete;
    assert.equal(host.el, host.child.falseDiv);
    assert.equal(host.elRef.value, host.child.falseDiv);
    assert.equal(host.count, 1);

    host.child.requestUpdate();
    await host.child.updateComplete;
    assert.equal(host.el, host.child.falseDiv);
    assert.equal(host.elRef.value, host.child.falseDiv);
    assert.equal(host.count, 1);

    host.bool = true;
    await host.updateComplete;
    await host.child.updateComplete;
    assert.equal(host.el, host.child.trueDiv);
    assert.equal(host.elRef.value, host.child.trueDiv);
    assert.equal(host.count, 3);
  });
});
