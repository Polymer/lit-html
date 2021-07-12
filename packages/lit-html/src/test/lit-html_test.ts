/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
import {
  ChildPart,
  CompiledTemplateResult,
  html,
  noChange,
  nothing,
  render,
  RenderOptions,
  svg,
  TemplateResult,
  SVGTemplateResult,
  SanitizerFactory,
  Part,
  CompiledTemplate,
} from '../lit-html.js';
import * as litHtmlLib from '../lit-html.js';

import {directive, Directive, PartType, PartInfo} from '../directive.js';
import {assert} from '@esm-bundle/chai';
import {
  stripExpressionComments,
  stripExpressionMarkers,
} from './test-utils/strip-markers.js';
import {repeat} from '../directives/repeat.js';
import {AsyncDirective} from '../async-directive.js';

import {createRef, ref} from '../directives/ref.js';

// For compiled template tests
import {_$LH} from '../private-ssr-support.js';
const {AttributePart} = _$LH;

type AttributePart = InstanceType<typeof AttributePart>;

const ua = window.navigator.userAgent;
const isIe = ua.indexOf('Trident/') > 0;
// We don't have direct access to DEV_MODE, but this is a good enough
// proxy.
const DEV_MODE = render.setSanitizer != null;
/**
 * litHtmlLib.INTERNAL is not exported in prod mode
 */
const INTERNAL = litHtmlLib.INTERNAL === true;

suite('lit-html', () => {
  let container: HTMLDivElement;

  setup(() => {
    container = document.createElement('div');
  });

  const assertRender = (
    r: TemplateResult | CompiledTemplateResult,
    expected: string,
    options?: RenderOptions
  ) => {
    const part = render(r, container, options);
    assert.equal(stripExpressionComments(container.innerHTML), expected);
    return part;
  };

  const assertContent = (expected: string) => {
    assert.equal(stripExpressionComments(container.innerHTML), expected);
  };

  /**
   * These test the ability to insert the correct expression marker into the
   * HTML string before being parsed by innerHTML. Some of the tests have
   * malformed HTML to test for reasonable (non-crashing) behavior in edge
   * cases, though the exact behavior is undefined.
   */
  suite('marker insertion', () => {
    test('only text', () => {
      assertRender(html`${'A'}`, 'A');
    });

    test('attribute-like text', () => {
      assertRender(html`a=${'A'}`, 'a=A');
    });

    test('< in text', () => {
      assertRender(html`a < ${'b'}`, 'a &lt; b');
    });

    test('after tag-like in text', () => {
      assertRender(html`a <1a> ${'b'}`, 'a &lt;1a&gt; b');
      assertRender(html`a <-a> ${'b'}`, 'a &lt;-a&gt; b');
      assertRender(html`a <:a> ${'b'}`, 'a &lt;:a&gt; b');
    });

    test('text child', () => {
      assertRender(html`<div>${'A'}</div>`, '<div>A</div>');
    });

    test('text child of various tag names', () => {
      assertRender(html`<x-foo>${'A'}</x-foo>`, '<x-foo>A</x-foo>');
      assertRender(html`<x=foo>${'A'}</x=foo>`, '<x=foo>A</x=foo>');
      assertRender(html`<x:foo>${'A'}</x:foo>`, '<x:foo>A</x:foo>');
      assertRender(html`<x1>${'A'}</x1>`, '<x1>A</x1>');
    });

    test('text after self-closing tag', () => {
      assertRender(html`<input />${'A'}`, '<input>A');
      assertRender(
        html`<!-- @ts-ignore --><x-foo />${'A'}`,
        '<!-- @ts-ignore --><x-foo>A</x-foo>'
      );
    });

    test('text child of element with unbound quoted attribute', () => {
      assertRender(html`<div a="b">${'d'}</div>`, '<div a="b">d</div>');

      render(html`<script a="b" type="foo">${'d'}</script>`, container);
      assert.include(
        [
          '<script a="b" type="foo">d</script>',
          '<script type="foo" a="b">d</script>',
        ],
        stripExpressionComments(container.innerHTML)
      );
    });

    test('text child of element with unbound unquoted attribute', () => {
      assertRender(html`<div a=b>${'d'}</div>`, '<div a="b">d</div>');

      render(html`<script a=b type="foo">${'d'}</script>`, container);
      assert.include(
        [
          '<script a="b" type="foo">d</script>',
          '<script type="foo" a="b">d</script>',
        ],
        stripExpressionComments(container.innerHTML)
      );
    });

    test('renders parts with whitespace after them', () => {
      assertRender(html`<div>${'foo'} </div>`, '<div>foo </div>');
    });

    test('renders parts that look like attributes', () => {
      assertRender(html`<div>foo bar=${'baz'}</div>`, '<div>foo bar=baz</div>');
    });

    test('renders multiple parts per element, preserving whitespace', () => {
      assertRender(html`<div>${'foo'} ${'bar'}</div>`, '<div>foo bar</div>');
    });

    test('renders templates with comments', () => {
      assertRender(
        html`
        <div>
          <!-- this is a comment -->
          <h1 class="${'foo'}">title</h1>
          <p>${'foo'}</p>
        </div>`,
        `
        <div>
          <!-- this is a comment -->
          <h1 class="foo">title</h1>
          <p>foo</p>
        </div>`
      );
    });

    test('text after element', () => {
      assertRender(html`<div></div>${'A'}`, '<div></div>A');
    });

    test('renders next templates with preceding elements', () => {
      assertRender(
        html`<a>${'foo'}</a>${html`<h1>${'bar'}</h1>`}`,
        '<a>foo</a><h1>bar</h1>'
      );
    });

    test('renders expressions with preceding elements', () => {
      // This is nearly the same test case as above, but was causing a
      // different stack trace
      assertRender(html`<a>${'foo'}</a>${'bar'}`, '<a>foo</a>bar');
    });

    test('text in raw text element after <', () => {
      // It doesn't matter much what marker we use in <script>, <style> and
      // <textarea> since comments aren't parsed and we have to search the text
      // anyway.
      assertRender(
        html`<script type="foo">i < j ${'A'}</script>`,
        '<script type="foo">i < j A</script>'
      );
    });

    test('text in raw text element after >', () => {
      assertRender(
        html`<script type="foo">i > j ${'A'}</script>`,
        '<script type="foo">i > j A</script>'
      );
    });

    test('text in raw text element inside tag-like string', () => {
      assertRender(
        html`<script type="foo">"<div a=${'A'}></div>";</script>`,
        '<script type="foo">"<div a=A></div>";</script>'
      );
    });

    test('renders inside <script>: only node', () => {
      assertRender(
        html`<script type="foo">${'foo'}</script>`,
        '<script type="foo">foo</script>'
      );
    });

    test('renders inside <script>: first node', () => {
      assertRender(
        html`<script type="foo">${'foo'}A</script>`,
        '<script type="foo">fooA</script>'
      );
    });

    test('renders inside <script>: last node', () => {
      assertRender(
        html`<script type="foo">A${'foo'}</script>`,
        '<script type="foo">Afoo</script>'
      );
    });

    test('renders inside <script>: multiple bindings', () => {
      assertRender(
        html`<script type="foo">A${'foo'}B${'bar'}C</script>`,
        '<script type="foo">AfooBbarC</script>'
      );
    });

    test('renders inside <script>: attribute-like', () => {
      assertRender(
        html`<script type="foo">a=${'foo'}</script>`,
        '<script type="foo">a=foo</script>'
      );
    });

    test('text after script element', () => {
      assertRender(html`<script></script>${'A'}`, '<script></script>A');
    });

    test('text after script element with binding', () => {
      assertRender(
        html`<script type="foo">${'A'}</script>${'B'}`,
        '<script type="foo">A</script>B'
      );
      assertRender(
        html`<script type="foo">1${'A'}</script>${'B'}`,
        '<script type="foo">1A</script>B'
      );
      assertRender(
        html`<script type="foo">${'A'}1</script>${'B'}`,
        '<script type="foo">A1</script>B'
      );
      assertRender(
        html`<script type="foo">${'A'}${'B'}</script>${'C'}`,
        '<script type="foo">AB</script>C'
      );
      assertRender(
        html`<script type="foo">${'A'}</script><p>${'B'}</p>`,
        '<script type="foo">A</script><p>B</p>'
      );
    });

    test('text after style element', () => {
      assertRender(html`<style></style>${'A'}`, '<style></style>A');
    });

    test('text inside raw text element, after different raw tag', () => {
      assertRender(
        html`<script type="foo"><style></style>"<div a=${'A'}></div>"</script>`,
        '<script type="foo"><style></style>"<div a=A></div>"</script>'
      );
    });

    test('text inside raw text element, after different raw end tag', () => {
      assertRender(
        html`<script type="foo"></style>"<div a=${'A'}></div>"</script>`,
        '<script type="foo"></style>"<div a=A></div>"</script>'
      );
    });

    test('renders inside raw-like element', () => {
      assertRender(html`<scriptx>${'foo'}</scriptx>`, '<scriptx>foo</scriptx>');
    });

    test('attribute after raw text element', () => {
      assertRender(
        html`<script></script><div a=${'A'}></div>`,
        '<script></script><div a="A"></div>'
      );
    });

    test('unquoted attribute', () => {
      assertRender(html`<div a=${'A'}></div>`, '<div a="A"></div>');
      assertRender(html`<div abc=${'A'}></div>`, '<div abc="A"></div>');
      assertRender(html`<div abc = ${'A'}></div>`, '<div abc="A"></div>');
      assertRender(html`<input value=${'A'}/>`, '<input value="A">');
      assertRender(html`<input value=${'A'}${'B'}/>`, '<input value="AB">');
    });

    test('quoted attribute', () => {
      assertRender(html`<div a="${'A'}"></div>`, '<div a="A"></div>');
      assertRender(html`<div abc="${'A'}"></div>`, '<div abc="A"></div>');
      assertRender(html`<div abc = "${'A'}"></div>`, '<div abc="A"></div>');
      assertRender(html`<div abc="${'A'}/>"></div>`, '<div abc="A/>"></div>');
      assertRender(html`<input value="${'A'}"/>`, '<input value="A">');
    });

    test('second quoted attribute', () => {
      assertRender(
        html`<div a="b" c="${'A'}"></div>`,
        '<div a="b" c="A"></div>'
      );
    });

    test('two quoted attributes', () => {
      assertRender(
        html`<div a="${'A'}" b="${'A'}"></div>`,
        '<div a="A" b="A"></div>'
      );
    });

    test('two unquoted attributes', () => {
      assertRender(
        html`<div a=${'A'} b=${'A'}></div>`,
        '<div a="A" b="A"></div>'
      );
    });

    test('quoted attribute multi', () => {
      assertRender(html`<div a="${'A'} ${'A'}"></div>`, '<div a="A A"></div>');
    });

    test('quoted attribute with markup', () => {
      assertRender(
        html`<div a="<table>${'A'}"></div>`,
        '<div a="<table>A"></div>'
      );
    });

    test('text after quoted bound attribute', () => {
      assertRender(html`<div a="${'A'}">${'A'}</div>`, '<div a="A">A</div>');
      assertRender(
        html`<script type="foo" a="${'A'}">${'A'}</script>`,
        '<script type="foo" a="A">A</script>'
      );
    });

    test('text after unquoted bound attribute', () => {
      assertRender(html`<div a=${'A'}>${'A'}</div>`, '<div a="A">A</div>');
      assertRender(
        html`<script type="foo" a=${'A'}>${'A'}</script>`,
        '<script type="foo" a="A">A</script>'
      );
    });

    test('inside start tag', () => {
      assertRender(html`<div ${`a`}></div>`, '<div></div>');
    });

    test('inside start tag x2', () => {
      // We don't support multiple attribute-position bindings yet, so just
      // ensure this parses ok
      assertRender(html`<div ${`a`} ${`a`}></div>`, '<div></div>');
    });

    test('inside start tag after quoted attribute', () => {
      assertRender(html`<div a="b" ${`c`}></div>`, '<div a="b"></div>');
      assertRender(
        html`<script a="b" ${`c`}></script>`,
        '<script a="b"></script>'
      );
    });

    test('inside start tag after unquoted attribute', () => {
      // prettier-ignore
      assertRender(html`<div a=b ${`c`}></div>`, '<div a="b"></div>');
    });

    test('inside start tag before unquoted attribute', () => {
      // bound attributes always appear after static attributes
      assertRender(html`<div ${`c`} a="b"></div>`, '<div a="b"></div>');
    });

    test('inside start tag before quoted attribute', () => {
      // bound attributes always appear after static attributes
      assertRender(html`<div ${`c`} a="b"></div>`, '<div a="b"></div>');
    });

    test('"dynamic" tag name', () => {
      render(html`<${'A'}></${'A'}>`, container);
      assert.equal(stripExpressionMarkers(container.innerHTML), '<></>');
    });

    test('malformed "dynamic" tag name', () => {
      // `</ ` starts a comment
      render(html`<${'A'}></ ${'A'}>`, container);
      assert.equal(
        stripExpressionMarkers(container.innerHTML),
        '<><!-- --></>'
      );

      // Currently fails:
      // render(html`<${'A'}></ ${'A'}>${'B'}`, container);
      // assert.equal(stripExpressionMarkers(container.innerHTML), '<><!-- -->B</>');
    });

    test('binding after end tag name', () => {
      // we don't really care what the syntax position is here
      assertRender(html`<div></div ${'A'}>`, '<div></div>');

      // TODO (justinfagnani): This will fail. TBD how we want to handle it.
      // assertRender(html`<div></div ${'A'}>${'B'}`, '<div></div>B');
    });

    test('comment', () => {
      render(html`<!--${'A'}-->`, container);
      assert.equal(stripExpressionMarkers(container.innerHTML), '<!---->');
    });

    test('comment with attribute-like content', () => {
      render(html`<!-- a=${'A'}-->`, container);
      assert.equal(stripExpressionMarkers(container.innerHTML), '<!-- a=-->');
    });

    test('comment with element-like content', () => {
      render(html`<!-- <div>${'A'}</div> -->`, container);
      assert.equal(
        stripExpressionMarkers(container.innerHTML),
        '<!-- <div></div> -->'
      );
    });

    test('text after comment', () => {
      assertRender(html`<!-- -->${'A'}`, '<!-- -->A');
    });

    test('renders after existing content', () => {
      container.appendChild(document.createElement('div'));
      assertRender(html`<span></span>`, '<div></div><span></span>');
    });

    test('renders/updates before `renderBefore`, if specified', () => {
      const renderBefore = container.appendChild(document.createElement('div'));
      const template = html`<span></span>`;
      assertRender(template, '<span></span><div></div>', {
        renderBefore,
      });
      // Ensure re-render updates rather than re-rendering.
      const containerChildNodes = Array.from(container.childNodes);
      assertRender(template, '<span></span><div></div>', {
        renderBefore,
      });
      assert.sameMembers(Array.from(container.childNodes), containerChildNodes);
    });

    test('renders/updates same template before different `renderBefore` nodes', () => {
      const renderBefore1 = container.appendChild(
        document.createElement('div')
      );
      const renderBefore2 = container.appendChild(
        document.createElement('div')
      );
      const template = html`<span></span>`;
      assertRender(template, '<span></span><div></div><div></div>', {
        renderBefore: renderBefore1,
      });
      const renderedNode1 = container.querySelector('span');
      assertRender(
        template,
        '<span></span><div></div><span></span><div></div>',
        {
          renderBefore: renderBefore2,
        }
      );
      const renderedNode2 = container.querySelector('span:last-of-type');
      // Ensure updates are handled as expected.
      assertRender(
        template,
        '<span></span><div></div><span></span><div></div>',
        {
          renderBefore: renderBefore1,
        }
      );
      assert.equal(container.querySelector('span'), renderedNode1);
      assert.equal(container.querySelector('span:last-of-type'), renderedNode2);
      assertRender(
        template,
        '<span></span><div></div><span></span><div></div>',
        {
          renderBefore: renderBefore2,
        }
      );
      assert.equal(container.querySelector('span'), renderedNode1);
      assert.equal(container.querySelector('span:last-of-type'), renderedNode2);
    });

    test('renders/updates when specifying `renderBefore` node or not', () => {
      const template = html`<span></span>`;
      const renderBefore = container.appendChild(document.createElement('div'));
      assertRender(template, '<div></div><span></span>');
      const containerRenderedNode = container.querySelector('span');
      assertRender(template, '<span></span><div></div><span></span>', {
        renderBefore,
      });
      const beforeRenderedNode = container.querySelector('span');
      // Ensure re-render updates rather than re-rendering.
      assertRender(template, '<span></span><div></div><span></span>');
      assert.equal(
        container.querySelector('span:last-of-type'),
        containerRenderedNode
      );
      assert.equal(container.querySelector('span'), beforeRenderedNode);
      assertRender(template, '<span></span><div></div><span></span>', {
        renderBefore,
      });
      assert.equal(
        container.querySelector('span:last-of-type'),
        containerRenderedNode
      );
      assert.equal(container.querySelector('span'), beforeRenderedNode);
    });

    test('back-to-back expressions', () => {
      const template = (a: unknown, b: unknown) =>
        html`${html`${a}`}${html`${b}`}`;
      assertRender(template('a', 'b'), 'ab');
      assertRender(template(nothing, 'b'), 'b');
      assertRender(template(nothing, nothing), '');
      assertRender(template('a', 'b'), 'ab');
    });
  });

  suite('text', () => {
    const assertNoRenderedNodes = () => {
      const children = Array.from(container.querySelector('div')!.childNodes);
      assert.isEmpty(
        children.filter((node) => node.nodeType !== Node.COMMENT_NODE)
      );
    };

    test('renders plain text expression', () => {
      render(html`test`, container);
      assertContent('test');
    });

    test('renders a string', () => {
      render(html`<div>${'foo'}</div>`, container);
      assertContent('<div>foo</div>');
    });

    test('renders a number', () => {
      render(html`<div>${123}</div>`, container);
      assertContent('<div>123</div>');
    });

    [nothing, undefined, null, ''].forEach((value: unknown) => {
      test(`renders '${
        value === '' ? 'empty string' : value === nothing ? 'nothing' : value
      }' as nothing`, () => {
        const template = (i: any) => html`<div>${i}</div>`;
        render(template(value), container);
        assertNoRenderedNodes();
        render(template('foo'), container);
        render(template(value), container);
        assertNoRenderedNodes();
      });
    });

    test('renders noChange', () => {
      const template = (i: any) => html`<div>${i}</div>`;
      render(template('foo'), container);
      render(template(noChange), container);
      assertContent('<div>foo</div>');
    });

    test.skip('renders a Symbol', () => {
      render(html`<div>${Symbol('A')}</div>`, container);
      assert.include(
        container.querySelector('div')!.textContent!.toLowerCase(),
        'symbol'
      );
    });

    test('does not call a function bound to text', () => {
      const f = () => {
        throw new Error();
      };
      render(html`${f}`, container);
    });

    test('renders nested templates', () => {
      const partial = html`<h1>${'foo'}</h1>`;
      render(html`${partial}${'bar'}`, container);
      assertContent('<h1>foo</h1>bar');
    });

    test('renders a template nested multiple times', () => {
      const partial = html`<h1>${'foo'}</h1>`;
      render(html`${partial}${'bar'}${partial}${'baz'}qux`, container);
      assertContent('<h1>foo</h1>bar<h1>foo</h1>bazqux');
    });

    test('renders value that switches between template and undefined', () => {
      const go = (v: unknown) => render(html`${v}`, container);
      go(undefined);
      assertContent('');
      go(html`<h1>Hello</h1>`);
      assertContent('<h1>Hello</h1>');
    });

    test('renders an element', () => {
      const child = document.createElement('p');
      render(html`<div>${child}</div>`, container);
      assertContent('<div><p></p></div>');
    });

    test('renders forms as elements', () => {
      // Forms are both a Node and iterable, so make sure they are rendered as
      // a Node.

      const form = document.createElement('form');
      const inputOne = document.createElement('input');
      inputOne.name = 'one';
      const inputTwo = document.createElement('input');
      inputTwo.name = 'two';

      form.appendChild(inputOne);
      form.appendChild(inputTwo);

      render(html`${form}`, container);

      assertContent('<form><input name="one"><input name="two"></form>');
    });
  });

  suite('arrays & iterables', () => {
    test('renders arrays', () => {
      render(html`<div>${[1, 2, 3]}</div>`, container);
      assertContent('<div>123</div>');
    });

    test('renders arrays of nested templates', () => {
      render(html`<div>${[1, 2, 3].map((i) => html`${i}`)}</div>`, container);
      assertContent('<div>123</div>');
    });

    test('renders an array of elements', () => {
      const children = [
        document.createElement('p'),
        document.createElement('a'),
        document.createElement('span'),
      ];
      render(html`<div>${children}</div>`, container);
      assertContent('<div><p></p><a></a><span></span></div>');
    });

    test('updates when called multiple times with arrays', () => {
      const ul = (list: string[]) => {
        const items = list.map((item) => html`<li>${item}</li>`);
        return html`<ul>${items}</ul>`;
      };
      render(ul(['a', 'b', 'c']), container);
      assertContent('<ul><li>a</li><li>b</li><li>c</li></ul>');
      render(ul(['x', 'y']), container);
      assertContent('<ul><li>x</li><li>y</li></ul>');
    });

    test('updates arrays', () => {
      let items = [1, 2, 3];
      const t = () => html`<div>${items}</div>`;
      render(t(), container);
      assertContent('<div>123</div>');

      items = [3, 2, 1];
      render(t(), container);
      assertContent('<div>321</div>');
    });

    test('updates arrays that shrink then grow', () => {
      let items: number[];
      const t = () => html`<div>${items}</div>`;

      items = [1, 2, 3];
      render(t(), container);
      assertContent('<div>123</div>');

      items = [4];
      render(t(), container);
      assertContent('<div>4</div>');

      items = [5, 6, 7];
      render(t(), container);
      assertContent('<div>567</div>');
    });

    test('updates an array of elements', () => {
      let children: any = [
        document.createElement('p'),
        document.createElement('a'),
        document.createElement('span'),
      ];
      const t = () => html`<div>${children}</div>`;
      render(t(), container);
      assertContent('<div><p></p><a></a><span></span></div>');

      children = null;
      render(t(), container);
      assertContent('<div></div>');

      children = document.createTextNode('foo');
      render(t(), container);
      assertContent('<div>foo</div>');
    });
  });

  suite('svg', () => {
    test('renders SVG', () => {
      const container = document.createElement('svg');
      const t = svg`<line y1="1" y2="1"/>`;
      render(t, container);
      const line = container.firstElementChild!;
      assert.equal(line.tagName, 'line');
      assert.equal(line.namespaceURI, 'http://www.w3.org/2000/svg');
    });

    const staticAssertExtends = <T, U extends T>(_?: [T, U]) => {};

    test('`SVGTemplateResult` is a subtype of `TemplateResult`', () => {
      staticAssertExtends<TemplateResult, SVGTemplateResult>();
    });

    test('`svg` returns an `SVGTemplateResult`', () => {
      staticAssertExtends<SVGTemplateResult, ReturnType<typeof svg>>();
    });
  });

  suite('attributes', () => {
    test('renders to a quoted attribute', () => {
      render(html`<div foo="${'bar'}"></div>`, container);
      assertContent('<div foo="bar"></div>');
    });

    test('renders to an unquoted attribute', () => {
      assertRender(html`<div foo=${'bar'}></div>`, '<div foo="bar"></div>');
      assertRender(
        html`<div foo=${'bar'}/baz></div>`,
        '<div foo="bar/baz"></div>'
      );
    });

    test('renders to an unquoted attribute after an unbound unquoted attribute', () => {
      assertRender(
        html`<div foo=bar baz=${'qux'}></div>`,
        '<div foo="bar" baz="qux"></div>'
      );
      assertRender(
        html`<div foo=a/b baz=${'qux'}></div>`,
        '<div foo="a/b" baz="qux"></div>'
      );
    });

    test('renders interpolation to a quoted attribute', () => {
      render(html`<div foo="A${'B'}C"></div>`, container);
      assertContent('<div foo="ABC"></div>');
      render(html`<div foo="${'A'}B${'C'}"></div>`, container);
      assertContent('<div foo="ABC"></div>');
    });

    test('renders interpolation to an unquoted attribute', () => {
      render(html`<div foo=A${'B'}C></div>`, container);
      assertContent('<div foo="ABC"></div>');
      render(html`<div foo=${'A'}B${'C'}></div>`, container);
      assertContent('<div foo="ABC"></div>');
    });

    test('renders interpolation to an unquoted attribute with nbsp character', () => {
      assertRender(
        html`<div a=${'A'}\u00a0${'B'}></div>`,
        '<div a="A&nbsp;B"></div>'
      );
    });

    test('renders interpolation to a quoted attribute with nbsp character', () => {
      assertRender(
        html`<div a="${'A'}\u00a0${'B'}"></div>`,
        '<div a="A&nbsp;B"></div>'
      );
    });

    test('renders non-latin attribute name and interpolated unquoted non-latin values', () => {
      assertRender(
        html`<div ふ=ふ${'ふ'}ふ フ=フ${'フ'}フ></div>`,
        '<div ふ="ふふふ" フ="フフフ"></div>'
      );
    });

    test('renders multiple bindings in an attribute', () => {
      render(html`<div foo="a${'b'}c${'d'}e"></div>`, container);
      assertContent('<div foo="abcde"></div>');
    });

    test('renders two attributes on one element', () => {
      const result = html`<div a="${1}" b="${2}"></div>`;
      render(result, container);
      assertContent('<div a="1" b="2"></div>');
    });

    test('renders multiple bindings in two attributes', () => {
      render(
        html`<div foo="a${'b'}c${'d'}e" bar="a${'b'}c${'d'}e"></div>`,
        container
      );
      assertContent('<div foo="abcde" bar="abcde"></div>');
    });

    test.skip('renders a Symbol to an attribute', () => {
      render(html`<div foo=${Symbol('A')}></div>`, container);
      assert.include(container.querySelector('div')!.getAttribute('foo'), '');
    });

    test.skip('renders a Symbol in an array to an attribute', () => {
      render(html`<div foo=${[Symbol('A')] as any}></div>`, container);
      assert.include(container.querySelector('div')!.getAttribute('foo')!, '');
    });

    test('renders a binding in a style attribute', () => {
      const t = html`<div style="color: ${'red'}"></div>`;
      render(t, container);
      if (isIe) {
        assertContent('<div style="color: red;"></div>');
      } else {
        assertContent('<div style="color: red"></div>');
      }
    });

    test('renders multiple bindings in a style attribute', () => {
      const t = html`<div style="${'color'}: ${'red'}"></div>`;
      render(t, container);
      if (isIe) {
        assertContent('<div style="color: red;"></div>');
      } else {
        assertContent('<div style="color: red"></div>');
      }
    });

    test('renders a binding in a class attribute', () => {
      render(html`<div class="${'red'}"></div>`, container);
      assertContent('<div class="red"></div>');
    });

    test('renders a binding in an input value attribute', () => {
      render(html`<input value="${'the-value'}" />`, container);
      assertContent('<input value="the-value">');
      assert.equal(container.querySelector('input')!.value, 'the-value');
    });

    test('renders a case-sensitive attribute', () => {
      const size = 100;
      render(html`<svg viewBox="0 0 ${size} ${size}"></svg>`, container);
      assert.include(
        stripExpressionComments(container.innerHTML),
        'viewBox="0 0 100 100"'
      );

      // Make sure non-alpha valid attribute name characters are handled
      render(html`<svg view_Box="0 0 ${size} ${size}"></svg>`, container);
      assert.include(
        stripExpressionComments(container.innerHTML),
        'view_Box="0 0 100 100"'
      );
    });

    test('renders to an attribute expression after an attribute literal', () => {
      render(html`<div a="b" foo="${'bar'}"></div>`, container);
      // IE and Edge can switch attribute order!
      assert.include(
        ['<div a="b" foo="bar"></div>', '<div foo="bar" a="b"></div>'],
        stripExpressionComments(container.innerHTML)
      );
    });

    test('renders to an attribute expression before an attribute literal', () => {
      render(html`<div foo="${'bar'}" a="b"></div>`, container);
      // IE and Edge can switch attribute order!
      assert.include(
        ['<div a="b" foo="bar"></div>', '<div foo="bar" a="b"></div>'],
        stripExpressionComments(container.innerHTML)
      );
    });

    // Regression test for exception in template parsing caused by attributes
    // reordering when a attribute binding precedes an attribute literal.
    test('renders attribute binding after attribute binding that moved', () => {
      render(
        html`<a href="${'foo'}" class="bar"><div id=${'a'}></div></a>`,
        container
      );
      assertContent(`<a class="bar" href="foo"><div id="a"></div></a>`);
    });

    test('renders a bound attribute without quotes', () => {
      render(html`<div foo=${'bar'}></div>`, container);
      assertContent('<div foo="bar"></div>');
    });

    test('renders multiple bound attributes', () => {
      render(
        html`<div foo="${'Foo'}" bar="${'Bar'}" baz=${'Baz'}></div>`,
        container
      );
      assert.oneOf(stripExpressionComments(container.innerHTML), [
        '<div foo="Foo" bar="Bar" baz="Baz"></div>',
        '<div foo="Foo" baz="Baz" bar="Bar"></div>',
        '<div bar="Bar" foo="Foo" baz="Baz"></div>',
      ]);
    });

    test('renders multiple bound attributes without quotes', () => {
      render(
        html`<div foo=${'Foo'} bar=${'Bar'} baz=${'Baz'}></div>`,
        container
      );
      assert.oneOf(stripExpressionComments(container.innerHTML), [
        '<div foo="Foo" bar="Bar" baz="Baz"></div>',
        '<div foo="Foo" baz="Baz" bar="Bar"></div>',
        '<div bar="Bar" foo="Foo" baz="Baz"></div>',
      ]);
    });

    test('renders multi-expression attribute without quotes', () => {
      render(html`<div foo="${'Foo'}${'Bar'}"></div>`, container);
      assertContent('<div foo="FooBar"></div>');
    });

    test('renders to attributes with attribute-like values', () => {
      render(html`<div foo="bar=${'foo'}"></div>`, container);
      assertContent('<div foo="bar=foo"></div>');
    });

    test('does not call a function bound to an attribute', () => {
      const f = () => {
        throw new Error();
      };
      render(html`<div foo=${f as any}></div>`, container);
      const div = container.querySelector('div')!;
      assert.isTrue(div.hasAttribute('foo'));
    });

    test('renders an array to an attribute', () => {
      render(html`<div foo=${['1', '2', '3'] as any}></div>`, container);
      assertContent('<div foo="1,2,3"></div>');
    });

    test('renders to an attribute before a node', () => {
      render(html`<div foo="${'bar'}">${'baz'}</div>`, container);
      assertContent('<div foo="bar">baz</div>');
    });

    test('renders to an attribute after a node', () => {
      render(html`<div>${'baz'}</div><div foo="${'bar'}"></div>`, container);
      assertContent('<div>baz</div><div foo="bar"></div>');
    });

    test('renders undefined in attributes', () => {
      render(html`<div attribute="it's ${undefined}"></div>`, container);
      assert.equal(
        stripExpressionComments(container.innerHTML),
        '<div attribute="it\'s "></div>'
      );
    });

    test('renders undefined in attributes', () => {
      render(html`<div attribute="${undefined as any}"></div>`, container);
      assertContent('<div attribute=""></div>');
    });

    test('renders null in attributes', () => {
      render(html`<div attribute="${null as any}"></div>`, container);
      assertContent('<div attribute=""></div>');
    });

    test('nothing sentinel removes an attribute', () => {
      const go = (v: any) => html`<div a=${v}></div>`;
      render(go(nothing), container);
      assertContent('<div></div>');

      render(go('a'), container);
      assertContent('<div a="a"></div>');

      render(go(nothing), container);
      assertContent('<div></div>');
    });

    test('interpolated nothing sentinel removes an attribute', () => {
      const go = (v: any) => html`<div a="A${v}"></div>`;
      render(go('a'), container);
      assertContent('<div a="Aa"></div>');

      render(go(nothing), container);
      assertContent('<div></div>');
    });

    test('noChange works', () => {
      const go = (v: any) => render(html`<div foo=${v}></div>`, container);
      go('A');
      assert.equal(
        stripExpressionComments(container.innerHTML),
        '<div foo="A"></div>',
        'A'
      );
      const observer = new MutationObserver(() => {});
      observer.observe(container, {attributes: true, subtree: true});

      go(noChange);
      assert.equal(
        stripExpressionComments(container.innerHTML),
        '<div foo="A"></div>',
        'B'
      );
      assert.isEmpty(observer.takeRecords());
    });

    test('noChange works on one of multiple expressions', () => {
      const go = (a: any, b: any) =>
        render(html`<div foo="${a}:${b}"></div>`, container);
      go('A', 'B');
      assert.equal(
        stripExpressionComments(container.innerHTML),
        '<div foo="A:B"></div>',
        'A'
      );
      go(noChange, 'C');
      assert.equal(
        stripExpressionComments(container.innerHTML),
        '<div foo="A:C"></div>',
        'B'
      );
    });
  });

  suite('boolean attributes', () => {
    test('adds attributes for true values', () => {
      render(html`<div ?foo=${true}></div>`, container);
      assertContent('<div foo=""></div>');
    });

    test('removes attributes for false values', () => {
      render(html`<div ?foo=${false}></div>`, container);
      assertContent('<div></div>');
    });

    test('removes attributes for nothing values', () => {
      const go = (v: any) => render(html`<div ?foo=${v}></div>`, container);

      go(nothing);
      assertContent('<div></div>');

      go(true);
      assertContent('<div foo=""></div>');

      go(nothing);
      assertContent('<div></div>');
    });

    test('noChange works', () => {
      const go = (v: any) => render(html`<div ?foo=${v}></div>`, container);
      go(true);
      assertContent('<div foo=""></div>');
      const observer = new MutationObserver(() => {});
      observer.observe(container, {attributes: true, subtree: true});
      go(noChange);
      assertContent('<div foo=""></div>');
      assert.isEmpty(observer.takeRecords());
    });
  });

  suite('properties', () => {
    test('sets properties', () => {
      render(html`<div .foo=${123} .Bar=${456}></div>`, container);
      const div = container.querySelector('div')!;
      assert.strictEqual((div as any).foo, 123);
      assert.strictEqual((div as any).Bar, 456);
    });

    test('nothing becomes undefined', () => {
      const go = (v: any) => render(html`<div .foo=${v}></div>`, container);

      go(1);
      const div = container.querySelector('div')!;
      assert.strictEqual((div as any).foo, 1);

      go(nothing);
      assert.strictEqual((div as any).foo, undefined);
    });

    test('null sets null', () => {
      const go = (v: any) => render(html`<div .foo=${v}></div>`, container);

      go(null);
      const div = container.querySelector('div')!;
      assert.strictEqual((div as any).foo, null);
    });

    test('null in multiple part sets empty string', () => {
      const go = (v1: any, v2: any) =>
        render(html`<div .foo="${v1}${v2}"></div>`, container);

      go('hi', null);
      const div = container.querySelector('div')!;
      assert.strictEqual((div as any).foo, 'hi');
    });

    test('undefined sets undefined', () => {
      const go = (v: any) => render(html`<div .foo=${v}></div>`, container);

      go(undefined);
      const div = container.querySelector('div')!;
      assert.strictEqual((div as any).foo, undefined);
    });

    test('undefined in multiple part sets empty string', () => {
      const go = (v1: any, v2: any) =>
        render(html`<div .foo="${v1}${v2}"></div>`, container);

      go('hi', undefined);
      const div = container.querySelector('div')!;
      assert.strictEqual((div as any).foo, 'hi');
    });

    test('noChange works', () => {
      const go = (v: any) => render(html`<div .foo=${v}></div>`, container);
      go(1);
      const div = container.querySelector('div')!;
      assert.strictEqual((div as any).foo, 1);

      go(noChange);
      assert.strictEqual((div as any).foo, 1);
    });
  });

  suite('events', () => {
    setup(() => {
      document.body.appendChild(container);
    });

    teardown(() => {
      document.body.removeChild(container);
    });

    test('adds event listener functions, calls with right this value', () => {
      let thisValue;
      let event: Event | undefined = undefined;
      const listener = function (this: any, e: any) {
        event = e;
        thisValue = this;
      };
      const host = {} as EventTarget;
      render(html`<div @click=${listener}></div>`, container, {host});
      const div = container.querySelector('div')!;
      div.click();
      if (event === undefined) {
        throw new Error(`Event listener never fired!`);
      }
      assert.equal(thisValue, host);

      // MouseEvent is not a function in IE, so the event cannot be an instance
      // of it
      if (typeof MouseEvent === 'function') {
        assert.instanceOf(event, MouseEvent);
      } else {
        assert.isDefined((event as MouseEvent).initMouseEvent);
      }
    });

    test('adds event listener objects, calls with right this value', () => {
      let thisValue;
      const listener = {
        handleEvent(_e: Event) {
          thisValue = this;
        },
      };
      const host = {} as EventTarget;
      render(html`<div @click=${listener}></div>`, container, {
        host,
      });
      const div = container.querySelector('div')!;
      div.click();
      assert.equal(thisValue, listener);
    });

    test('only adds event listener once', () => {
      let count = 0;
      const listener = () => {
        count++;
      };
      render(html`<div @click=${listener}></div>`, container);
      render(html`<div @click=${listener}></div>`, container);

      const div = container.querySelector('div')!;
      div.click();
      assert.equal(count, 1);
    });

    test('adds event listeners on self-closing tags', () => {
      let count = 0;
      const listener = () => {
        count++;
      };
      render(html`<div @click=${listener}/></div>`, container);

      const div = container.querySelector('div')!;
      div.click();
      assert.equal(count, 1);
    });

    test('allows updating event listener', () => {
      let count1 = 0;
      const listener1 = () => {
        count1++;
      };
      let count2 = 0;
      const listener2 = () => {
        count2++;
      };
      const t = (listener: () => void) => html`<div @click=${listener}></div>`;
      render(t(listener1), container);
      render(t(listener2), container);

      const div = container.querySelector('div')!;
      div.click();
      assert.equal(count1, 0);
      assert.equal(count2, 1);
    });

    test('allows updating event listener without extra calls to remove/addEventListener', () => {
      let listener: (() => void) | null;
      const t = () => html`<div @click=${listener}></div>`;
      render(t(), container);
      const div = container.querySelector('div')!;

      let addCount = 0;
      let removeCount = 0;
      div.addEventListener = () => addCount++;
      div.removeEventListener = () => removeCount++;

      listener = () => {};
      render(t(), container);
      assert.equal(addCount, 1);
      assert.equal(removeCount, 0);

      listener = () => {};
      render(t(), container);
      assert.equal(addCount, 1);
      assert.equal(removeCount, 0);

      listener = null;
      render(t(), container);
      assert.equal(addCount, 1);
      assert.equal(removeCount, 1);

      listener = () => {};
      render(t(), container);
      assert.equal(addCount, 2);
      assert.equal(removeCount, 1);

      listener = () => {};
      render(t(), container);
      assert.equal(addCount, 2);
      assert.equal(removeCount, 1);
    });

    test('removes event listeners', () => {
      let target;
      let listener: any = (e: any) => (target = e.target);
      const t = () => html`<div @click=${listener}></div>`;
      render(t(), container);
      const div = container.querySelector('div')!;
      div.click();
      assert.equal(target, div);

      listener = null;
      target = undefined;
      render(t(), container);
      div.click();
      assert.equal(target, undefined);
    });

    test('allows capturing events', () => {
      let event!: Event;
      let eventPhase!: number;
      const listener = {
        handleEvent(e: Event) {
          event = e;
          // read here because it changes
          eventPhase = event.eventPhase;
        },
        capture: true,
      };
      render(
        html`
          <div id="outer" @test=${listener}>
            <div id="inner"><div></div></div>
          </div>
        `,
        container
      );
      const inner = container.querySelector('#inner')!;
      inner.dispatchEvent(new Event('test'));
      assert.isOk(event);
      assert.equal(eventPhase, Event.CAPTURING_PHASE);
    });

    test('event listeners can see events fired by dynamic children', () => {
      // This tests that node directives are called in the commit phase, not
      // the setValue phase
      class TestElement1 extends HTMLElement {
        connectedCallback() {
          this.dispatchEvent(
            new CustomEvent('test-event', {
              bubbles: true,
            })
          );
        }
      }
      customElements.define('test-element-1', TestElement1);

      let event: Event | undefined = undefined;
      const listener = (e: Event) => {
        event = e;
      };
      document.body.appendChild(container);
      render(
        html`<div @test-event=${listener}>
          ${html`<test-element-1></test-element-1>`}
        </div>`,
        container
      );
      assert.isOk(event);
    });
  });

  suite('updates', () => {
    test('dirty checks simple values', () => {
      const foo = 'aaa';

      const t = () => html`<div>${foo}</div>`;

      render(t(), container);
      assertContent('<div>aaa</div>');
      const text = container.querySelector('div')!;
      assert.equal(text.textContent, 'aaa');

      // Set textContent manually. Since lit-html doesn't dirty check against
      // actual DOM, but again previous part values, this modification should
      // persist through the next render with the same value.
      text.textContent = 'bbb';
      assert.equal(text.textContent, 'bbb');
      assertContent('<div>bbb</div>');

      // Re-render with the same content, should be a no-op
      render(t(), container);
      assertContent('<div>bbb</div>');
      const text2 = container.querySelector('div')!;

      // The next node should be the same too
      assert.strictEqual(text, text2);
    });

    test('dirty checks node values', async () => {
      const node = document.createElement('div');
      const t = () => html`${node}`;

      const observer = new MutationObserver(() => {});
      observer.observe(container, {childList: true, subtree: true});

      assertContent('');
      render(t(), container);
      assertContent('<div></div>');

      const elementNodes: Node[] = [];
      let mutationRecords: MutationRecord[] = observer.takeRecords();
      for (const record of mutationRecords) {
        elementNodes.push(
          ...Array.from(record.addedNodes).filter(
            (n) => n.nodeType === Node.ELEMENT_NODE
          )
        );
      }
      assert.equal(elementNodes.length, 1);

      mutationRecords = [];
      render(t(), container);
      assertContent('<div></div>');
      mutationRecords = observer.takeRecords();
      assert.equal(mutationRecords.length, 0);
    });

    test('renders to and updates a container', () => {
      let foo = 'aaa';

      const t = () => html`<div>${foo}</div>`;

      render(t(), container);
      assertContent('<div>aaa</div>');
      const div = container.querySelector('div')!;
      assert.equal(div.tagName, 'DIV');

      foo = 'bbb';
      render(t(), container);
      assertContent('<div>bbb</div>');
      const div2 = container.querySelector('div')!;
      // check that only the part changed
      assert.equal(div, div2);
    });

    test('renders to and updates sibling parts', () => {
      let foo = 'foo';
      const bar = 'bar';

      const t = () => html`<div>${foo}${bar}</div>`;

      render(t(), container);
      assertContent('<div>foobar</div>');

      foo = 'bbb';
      render(t(), container);
      assertContent('<div>bbbbar</div>');
    });

    test('renders and updates attributes', () => {
      let foo = 'foo';
      const bar = 'bar';

      const t = () => html`<div a="${foo}:${bar}"></div>`;

      render(t(), container);
      assertContent('<div a="foo:bar"></div>');

      foo = 'bbb';
      render(t(), container);
      assertContent('<div a="bbb:bar"></div>');
    });

    test('updates nested templates', () => {
      let foo = 'foo';
      const bar = 'bar';
      const baz = 'baz';

      const t = (x: boolean) => {
        let partial;
        if (x) {
          partial = html`<h1>${foo}</h1>`;
        } else {
          partial = html`<h2>${bar}</h2>`;
        }

        return html`${partial}${baz}`;
      };

      render(t(true), container);
      assertContent('<h1>foo</h1>baz');

      foo = 'bbb';
      render(t(true), container);
      assertContent('<h1>bbb</h1>baz');

      render(t(false), container);
      assertContent('<h2>bar</h2>baz');
    });

    test('updates an element', () => {
      let child: any = document.createElement('p');
      const t = () => html`<div>${child}<div></div></div>`;
      render(t(), container);
      assertContent('<div><p></p><div></div></div>');

      child = undefined;
      render(t(), container);
      assertContent('<div><div></div></div>');

      child = document.createTextNode('foo');
      render(t(), container);
      assertContent('<div>foo<div></div></div>');
    });

    test(
      'overwrites an existing TemplateInstance if one exists and does ' +
        'not have a matching Template',
      () => {
        render(html`<div>foo</div>`, container);

        assert.equal(container.children.length, 1);
        const fooDiv = container.children[0];
        assert.equal(fooDiv.textContent, 'foo');

        render(html`<div>bar</div>`, container);

        assert.equal(container.children.length, 1);
        const barDiv = container.children[0];
        assert.equal(barDiv.textContent, 'bar');

        assert.notEqual(fooDiv, barDiv);
      }
    );
  });

  suite('compiled', () => {
    const trustedTypes = (globalThis as unknown as Partial<Window>)
      .trustedTypes;
    const policy = trustedTypes?.createPolicy('lit-html', {
      createHTML: (s) => s,
    }) ?? {createHTML: (s) => s as unknown as TrustedHTML};

    test('only text', () => {
      // A compiled template for html`${'A'}`
      const _$lit_template_1: CompiledTemplate = {
        h: policy.createHTML('<!---->'),
        parts: [{type: 2, index: 0}],
      };
      assertRender(
        {
          // This property needs to remain unminified.
          ['_$litType$']: _$lit_template_1,
          values: ['A'],
        },
        'A'
      );
    });

    test('text expression', () => {
      // A compiled template for html`<div>${'A'}</div>`
      const _$lit_template_1: CompiledTemplate = {
        h: policy.createHTML(`<div><!----></div>`),
        parts: [{type: 2, index: 1}],
      };
      const result = {
        // This property needs to remain unminified.
        ['_$litType$']: _$lit_template_1,
        values: ['A'],
      };
      assertRender(result, '<div>A</div>');
    });

    test('attribute expression', () => {
      // A compiled template for html`<div foo=${'A'}></div>`
      const _$lit_template_1: CompiledTemplate = {
        h: policy.createHTML('<div></div>'),
        parts: [
          {
            type: 1,
            index: 0,
            name: 'foo',
            strings: ['', ''],
            ctor: AttributePart,
          },
        ],
      };
      const result = {
        // This property needs to remain unminified.
        ['_$litType$']: _$lit_template_1,
        values: ['A'],
      };
      assertRender(result, '<div foo="A"></div>');
    });

    test('element expression', () => {
      const r = createRef();
      // A compiled template for html`<div ${ref(r)}></div>`
      const _$lit_template_1: CompiledTemplate = {
        h: policy.createHTML('<div></div>'),
        parts: [{type: 6, index: 0}],
      };
      const result = {
        // This property needs to remain unminified.
        ['_$litType$']: _$lit_template_1,
        values: [ref(r)],
      };
      assertRender(result, '<div></div>');
      const div = container.firstElementChild;
      assert.isDefined(div);
      assert.strictEqual(r.value, div);
    });
  });

  suite('directives', () => {
    // A stateful directive
    class CountDirective extends Directive {
      count = 0;
      render(id: string, log?: string[]) {
        const v = `${id}:${++this.count}`;
        if (log !== undefined) {
          log.push(v);
        }
        return v;
      }
    }
    const count = directive(CountDirective);

    test('renders directives on ChildParts', () => {
      class TestDirective extends Directive {
        render(v: string) {
          return html`TEST:${v}`;
        }
      }
      const testDirective = directive(TestDirective);

      render(html`<div>${testDirective('A')}</div>`, container);
      assertContent('<div>TEST:A</div>');
    });

    test('PartInfo includes metadata for directive in ChildPart', () => {
      let partInfo: PartInfo;
      const testDirective = directive(
        class extends Directive {
          constructor(info: PartInfo) {
            super(info);
            partInfo = info;
          }
          render(v: unknown) {
            return v;
          }
        }
      );
      render(html`<div>${testDirective('test')}</div>`, container);
      assert.equal(
        stripExpressionMarkers(container.innerHTML),
        '<div>test</div>'
      );
      assert.equal(partInfo!.type, PartType.CHILD);
    });

    suite('ChildPart invariants for parentNode, startNode, endNode', () => {
      class CheckNodePropertiesBehavior extends Directive {
        render() {
          return nothing;
        }

        update(part: ChildPart) {
          const {parentNode, startNode, endNode} = part;

          if (endNode !== null) {
            assert.notEqual(startNode, null);
          }

          if (startNode === null) {
            // The part covers all children in `parentNode`.
            assert.equal(parentNode.childNodes.length, 0);
            assert.equal(endNode, null);
          } else if (endNode === null) {
            // The part covers all siblings following `startNode`.
            assert.equal(startNode.nextSibling, null);
          } else {
            // The part covers all siblings between `startNode` and `endNode`.
            assert.equal<Node | null>(startNode.nextSibling, endNode);
          }

          return nothing;
        }
      }
      const checkNodePropertiesBehavior = directive(
        CheckNodePropertiesBehavior
      );

      test('when the directive is the only child', () => {
        const makeTemplate = (content: unknown) => html`<div>${content}</div>`;

        // Render twice so that `update` is called.
        render(makeTemplate(checkNodePropertiesBehavior()), container);
        render(makeTemplate(checkNodePropertiesBehavior()), container);
      });

      test('when the directive is the last child', () => {
        const makeTemplate = (content: unknown) =>
          html`<div>Earlier sibling. ${content}</div>`;

        // Render twice so that `update` is called.
        render(makeTemplate(checkNodePropertiesBehavior()), container);
        render(makeTemplate(checkNodePropertiesBehavior()), container);
      });

      test('when the directive is not the last child', () => {
        const makeTemplate = (content: unknown) =>
          html`<div>Earlier sibling. ${content} Later sibling.</div>`;

        // Render twice so that `update` is called.
        render(makeTemplate(checkNodePropertiesBehavior()), container);
        render(makeTemplate(checkNodePropertiesBehavior()), container);
      });
    });

    test('directives are stateful', () => {
      const go = (v: string) => {
        render(html`<div>${count(v)}</div>`, container);
      };
      go('A');
      assertContent('<div>A:1</div>');
      go('A');
      assertContent('<div>A:2</div>');
      go('B');
      assertContent('<div>B:3</div>');
    });

    test('directives can update', () => {
      let receivedPart: ChildPart;
      let receivedValue: unknown;

      class TestUpdateDirective extends Directive {
        render(v: unknown) {
          return v;
        }

        update(part: ChildPart, [v]: Parameters<this['render']>) {
          receivedPart = part;
          receivedValue = v;
          return this.render(v);
        }
      }
      const update = directive(TestUpdateDirective);
      const go = (v: boolean) => {
        render(html`<div>${update(v)}</div>`, container);
      };
      go(true);
      assertContent('<div>true</div>');
      assert.equal(receivedPart!.type, PartType.CHILD);
      assert.equal(receivedValue, true);
    });

    test('renders directives on AttributeParts', () => {
      const go = () => html`<div foo=${count('A')}></div>`;
      render(go(), container);
      assert.equal(
        stripExpressionMarkers(container.innerHTML),
        '<div foo="A:1"></div>'
      );
      render(go(), container);
      assert.equal(
        stripExpressionMarkers(container.innerHTML),
        '<div foo="A:2"></div>'
      );
    });

    test('renders multiple directives on AttributeParts', () => {
      const go = () => html`<div foo="a:${count('A')}:b:${count('B')}"></div>`;
      render(go(), container);
      assert.equal(
        stripExpressionMarkers(container.innerHTML),
        '<div foo="a:A:1:b:B:1"></div>'
      );
      render(go(), container);
      assert.equal(
        stripExpressionMarkers(container.innerHTML),
        '<div foo="a:A:2:b:B:2"></div>'
      );
    });

    test('PartInfo includes metadata for directive in AttributeParts', () => {
      let partInfo: PartInfo;
      const testDirective = directive(
        class extends Directive {
          constructor(info: PartInfo) {
            super(info);
            partInfo = info;
          }
          render(v: unknown) {
            return v;
          }
        }
      );
      render(html`<div title="a ${testDirective(1)} b"></div>`, container);
      assert.equal(
        stripExpressionMarkers(container.innerHTML),
        '<div title="a 1 b"></div>'
      );
      if (partInfo!.type !== PartType.ATTRIBUTE) {
        throw new Error('Expected attribute PartInfo');
      }
      assert.equal(partInfo!.tagName, 'DIV');
      assert.equal(partInfo!.name, 'title');
      assert.deepEqual(partInfo!.strings, ['a ', ' b']);
    });

    test('renders directives on PropertyParts', () => {
      render(html`<div .foo=${count('A')}></div>`, container);
      assert.equal(stripExpressionMarkers(container.innerHTML), '<div></div>');
      assert.strictEqual((container.firstElementChild as any).foo, 'A:1');
    });

    test('PartInfo includes metadata for directive in PropertyParts', () => {
      let partInfo: PartInfo;
      const testDirective = directive(
        class extends Directive {
          constructor(info: PartInfo) {
            super(info);
            partInfo = info;
          }
          render(v: unknown) {
            return v;
          }
        }
      );
      render(html`<div .title="a ${testDirective(1)} b"></div>`, container);
      assert.equal(
        stripExpressionMarkers(container.innerHTML),
        '<div title="a 1 b"></div>'
      );
      if (partInfo!.type !== PartType.PROPERTY) {
        throw new Error('Expected property PartInfo');
      }
      assert.equal(partInfo!.tagName, 'DIV');
      assert.equal(partInfo!.name, 'title');
      assert.deepEqual(partInfo!.strings, ['a ', ' b']);
    });

    test('renders directives on EventParts', () => {
      const handle = directive(
        class extends Directive {
          count = 0;
          render(value: string) {
            return (e: Event) => {
              (e.target as any).__clicked = `${value}:${++this.count}`;
            };
          }
        }
      );
      const template = (value: string) =>
        html`<div @click=${handle(value)}></div>`;
      render(template('A'), container);
      assert.equal(stripExpressionMarkers(container.innerHTML), '<div></div>');
      (container.firstElementChild as HTMLDivElement).click();
      assert.strictEqual((container.firstElementChild as any).__clicked, 'A:1');
      (container.firstElementChild as HTMLDivElement).click();
      assert.strictEqual((container.firstElementChild as any).__clicked, 'A:2');
      render(template('B'), container);
      (container.firstElementChild as HTMLDivElement).click();
      assert.strictEqual((container.firstElementChild as any).__clicked, 'B:3');
      (container.firstElementChild as HTMLDivElement).click();
      assert.strictEqual((container.firstElementChild as any).__clicked, 'B:4');
    });

    test('event listeners can see events fired in attribute directives', () => {
      class FireEventDirective extends Directive {
        render() {
          return nothing;
        }
        // TODO (justinfagnani): make this work on SpreadPart
        update(part: AttributePart) {
          part.element.dispatchEvent(
            new CustomEvent('test-event', {
              bubbles: true,
            })
          );
          return nothing;
        }
      }
      const fireEvent = directive(FireEventDirective);
      let event = undefined;
      const listener = (e: Event) => {
        event = e;
      };
      render(
        html`<div @test-event=${listener} b=${fireEvent()}></div>`,
        container
      );
      assert.isOk(event);
    });

    test('renders directives on ElementParts', () => {
      const log: string[] = [];
      assertRender(html`<div ${count('x', log)}></div>`, `<div></div>`);
      assert.deepEqual(log, ['x:1']);

      log.length = 0;
      assertRender(
        // Purposefully adds a self-closing tag slash
        html`<div a=${'a'} ${count('x', log)}/></div>`,
        `<div a="a"></div>`
      );
      assert.deepEqual(log, ['x:1']);

      log.length = 0;
      assertRender(
        html`<div ${count('x', log)} a=${'a'}>${'A'}</div>${'B'}`,
        `<div a="a">A</div>B`
      );
      assert.deepEqual(log, ['x:1']);

      log.length = 0;
      assertRender(
        html`<div a=${'a'} ${count('x', log)} b=${'b'}></div>`,
        `<div a="a" b="b"></div>`
      );
      assert.deepEqual(log, ['x:1']);

      log.length = 0;
      assertRender(
        html`<div ${count('x', log)} ${count('y', log)}></div>`,
        `<div></div>`
      );
      assert.deepEqual(log, ['x:1', 'y:1']);

      log.length = 0;
      const template = html`<div ${count('x', log)} a=${'a'} ${count(
        'y',
        log
      )}></div>`;
      assertRender(template, `<div a="a"></div>`);
      assert.deepEqual(log, ['x:1', 'y:1']);
      log.length = 0;
      assertRender(template, `<div a="a"></div>`);
      assert.deepEqual(log, ['x:2', 'y:2']);
    });

    test('directives have access to renderOptions', () => {
      const hostEl = document.createElement('input');
      hostEl.value = 'host';

      class HostDirective extends Directive {
        host?: HTMLInputElement;

        render(v: string) {
          return `${(this.host as HTMLInputElement)?.value}:${v}`;
        }

        update(part: Part, props: [v: string]) {
          this.host ??= part.options!.host as HTMLInputElement;
          return this.render(...props);
        }
      }
      const hostDirective = directive(HostDirective);

      render(
        html`<div attr=${hostDirective('attr')}>${hostDirective('node')}</div>`,
        container,
        {host: hostEl}
      );
      assertContent('<div attr="host:attr">host:node</div>');
    });

    suite('nested directives', () => {
      const aNothingDirective = directive(
        class extends Directive {
          render(bool: boolean, v: unknown) {
            return bool ? v : nothing;
          }
        }
      );

      let bDirectiveCount = 0;
      const bDirective = directive(
        class extends Directive {
          count = 0;
          constructor(part: PartInfo) {
            super(part);
            bDirectiveCount++;
          }
          render(v: unknown) {
            return `[B:${this.count++}:${v}]`;
          }
        }
      );

      test('nested directives in ChildPart', () => {
        bDirectiveCount = 0;
        const template = (bool: boolean, v: unknown) =>
          html`<div>${aNothingDirective(bool, bDirective(v))}`;
        assertRender(template(true, 'X'), `<div>[B:0:X]</div>`);
        assertRender(template(true, 'Y'), `<div>[B:1:Y]</div>`);
        assertRender(template(false, 'X'), `<div></div>`);
        assertRender(template(true, 'X'), `<div>[B:0:X]</div>`);
        assert.equal(bDirectiveCount, 2);
      });

      test('nested directives in AttributePart', () => {
        bDirectiveCount = 0;
        const template = (bool: boolean, v: unknown) =>
          html`<div a=${aNothingDirective(bool, bDirective(v))}></div>`;
        assertRender(template(true, 'X'), `<div a="[B:0:X]"></div>`);
        assertRender(template(true, 'Y'), `<div a="[B:1:Y]"></div>`);
        assertRender(template(false, 'X'), `<div></div>`);
        assertRender(template(true, 'X'), `<div a="[B:0:X]"></div>`);
        assert.equal(bDirectiveCount, 2);
      });

      suite('nested directives whose parent returns `noChange`', () => {
        const aNoChangeDirective = directive(
          class extends Directive {
            render(bool: boolean, v: unknown) {
              return bool ? v : noChange;
            }
          }
        );

        test('nested directives in ChildPart', () => {
          bDirectiveCount = 0;
          const template = (bool: boolean, v: unknown) =>
            html`<div>${aNoChangeDirective(bool, bDirective(v))}`;
          assertRender(template(true, 'X'), `<div>[B:0:X]</div>`);
          assertRender(template(true, 'Y'), `<div>[B:1:Y]</div>`);
          assertRender(template(false, 'X'), `<div>[B:1:Y]</div>`);
          assertRender(template(true, 'X'), `<div>[B:2:X]</div>`);
          assertRender(template(false, 'Y'), `<div>[B:2:X]</div>`);
          assert.equal(bDirectiveCount, 1);
        });

        test('nested directives in AttributePart', () => {
          bDirectiveCount = 0;
          const template = (bool: boolean, v: unknown) =>
            html`<div a=${aNoChangeDirective(bool, bDirective(v))}></div>`;
          assertRender(template(true, 'X'), `<div a="[B:0:X]"></div>`);
          assertRender(template(true, 'Y'), `<div a="[B:1:Y]"></div>`);
          assertRender(template(false, 'X'), `<div a="[B:1:Y]"></div>`);
          assertRender(template(true, 'X'), `<div a="[B:2:X]"></div>`);
          assertRender(template(false, 'Y'), `<div a="[B:2:X]"></div>`);
          assert.equal(bDirectiveCount, 1);
        });
      });
    });
  });

  suite('async directives', () => {
    const aDirective = directive(
      class extends AsyncDirective {
        value: unknown;
        promise!: Promise<unknown>;
        render(_promise: Promise<unknown>) {
          return 'initial';
        }
        update(_part: Part, [promise]: Parameters<this['render']>) {
          if (promise !== this.promise) {
            this.promise = promise;
            promise.then((value) => this.setValue((this.value = value)));
          }
          return this.value ?? this.render(promise);
        }
      }
    );
    const bDirective = directive(
      class extends Directive {
        count = 0;
        render(v: unknown) {
          return `[B:${this.count++}:${v}]`;
        }
      }
    );

    test('async directives in ChildPart', async () => {
      const template = (promise: Promise<unknown>) =>
        html`<div>${aDirective(promise)}</div>`;
      let promise = Promise.resolve('resolved1');
      assertRender(template(promise), `<div>initial</div>`);
      await promise;
      assertContent(`<div>resolved1</div>`);
      promise = Promise.resolve('resolved2');
      assertRender(template(promise), `<div>resolved1</div>`);
      await promise;
      assertContent(`<div>resolved2</div>`);
    });

    test('async directives while disconnected in ChildPart', async () => {
      const template = (promise: Promise<unknown>) =>
        html`<div>${aDirective(promise)}</div>`;
      const promise = Promise.resolve('resolved1');
      const part = assertRender(template(promise), `<div>initial</div>`);
      part.setConnected(false);
      await promise;
      assertContent(`<div>initial</div>`);
      part.setConnected(true);
      assertContent(`<div>resolved1</div>`);
    });

    test('async directives while disconnected in ChildPart clears its value', async () => {
      const log: string[] = [];
      const template = (promise: Promise<unknown>) =>
        html`<div>${aDirective(promise)}</div>`;
      // Async render a TemplateResult containing a AsyncDirective
      let promise: Promise<unknown> = Promise.resolve(
        html`${disconnectingDirective(log, 'dd', 'dd')}`
      );
      const part = assertRender(template(promise), `<div>initial</div>`);
      await promise;
      assertContent(`<div>dd</div>`);
      // Eneuque an async clear of the TemplateResult+AsyncDirective
      promise = Promise.resolve(nothing);
      assertRender(template(promise), `<div>dd</div>`);
      assert.deepEqual(log, []);
      // Disconnect the tree before the clear is committed
      part.setConnected(false);
      assert.deepEqual(log, ['disconnected-dd']);
      await promise;
      assert.deepEqual(log, ['disconnected-dd']);
      assertContent(`<div>dd</div>`);
      // Re-connect the tree, which should clear the part but not reconnect
      // the AsyncDirective that was cleared
      part.setConnected(true);
      assertRender(template(promise), `<div></div>`);
      assert.deepEqual(log, ['disconnected-dd']);
    });

    test('async nested directives in ChildPart', async () => {
      const template = (promise: Promise<unknown>) =>
        html`<div>${aDirective(promise)}</div>`;
      let promise = Promise.resolve(bDirective('X'));
      assertRender(template(promise), `<div>initial</div>`);
      await promise;
      assertContent(`<div>[B:0:X]</div>`);
      assertRender(template(promise), `<div>[B:1:X]</div>`);
      promise = Promise.resolve(bDirective('Y'));
      assertRender(template(promise), `<div>[B:2:X]</div>`);
      await promise;
      assertContent(`<div>[B:3:Y]</div>`);
    });

    test('async directives in AttributePart', async () => {
      const template = (promise: Promise<unknown>) =>
        html`<div a="${'**'}${aDirective(promise)}${'##'}"></div>`;
      let promise = Promise.resolve('resolved1');
      assertRender(template(promise), `<div a="**initial##"></div>`);
      await promise;
      assertContent(`<div a="**resolved1##"></div>`);
      promise = Promise.resolve('resolved2');
      assertRender(template(promise), `<div a="**resolved1##"></div>`);
      await promise;
      assertContent(`<div a="**resolved2##"></div>`);
    });

    test('async directives while disconnected in AttributePart', async () => {
      const template = (promise: Promise<unknown>) =>
        html`<div a="${'**'}${aDirective(promise)}${'##'}"></div>`;
      const promise = Promise.resolve('resolved1');
      const part = assertRender(
        template(promise),
        `<div a="**initial##"></div>`
      );
      part.setConnected(false);
      await promise;
      assertContent(`<div a="**initial##"></div>`);
      part.setConnected(true);
      assertContent(`<div a="**resolved1##"></div>`);
    });

    test('async nested directives in AttributePart', async () => {
      const template = (promise: Promise<unknown>) =>
        html`<div a="${'**'}${aDirective(promise)}${'##'}"></div>`;
      let promise = Promise.resolve(bDirective('X'));
      assertRender(template(promise), `<div a="**initial##"></div>`);
      await promise;
      assertContent(`<div a="**[B:0:X]##"></div>`);
      promise = Promise.resolve(bDirective('Y'));
      assertRender(template(promise), `<div a="**[B:1:X]##"></div>`);
      await promise;
      assertContent(`<div a="**[B:2:Y]##"></div>`);
    });

    const disconnectingDirective = directive(
      class extends AsyncDirective {
        log!: Array<string>;
        id!: string;

        render(log: Array<string>, id = '', value?: unknown, bool = true) {
          this.log = log;
          this.id = id;
          return bool ? value : nothing;
        }

        disconnected() {
          this.log.push('disconnected' + (this.id ? `-${this.id}` : ''));
        }
        reconnected() {
          this.log.push('reconnected' + (this.id ? `-${this.id}` : ''));
        }
      }
    );

    const passthroughDirective = directive(
      class extends Directive {
        render(value: unknown, bool = true) {
          return bool ? value : nothing;
        }
      }
    );

    test('directives can be disconnected from ChildParts', () => {
      const log: Array<string> = [];
      const go = (x: boolean) =>
        render(html`${x ? disconnectingDirective(log) : nothing}`, container);
      go(true);
      assert.isEmpty(log);
      go(false);
      assert.deepEqual(log, ['disconnected']);
    });

    test('directives are disconnected when their template is', () => {
      const log: Array<string> = [];
      const go = (x: boolean) =>
        render(x ? html`${disconnectingDirective(log)}` : nothing, container);
      go(true);
      assert.isEmpty(log);
      go(false);
      assert.deepEqual(log, ['disconnected']);
    });

    test('directives are disconnected when their nested template is', () => {
      const log: Array<string> = [];
      const go = (x: boolean) =>
        render(
          x ? html`${html`${disconnectingDirective(log)}`}` : nothing,
          container
        );
      go(true);
      assert.isEmpty(log);
      go(false);
      assert.deepEqual(log, ['disconnected']);
    });

    test('directives in different subtrees can be disconnected in separate renders', () => {
      const log: Array<string> = [];
      const go = (left: boolean, right: boolean) =>
        render(
          html`
            ${html`${html`${
              left ? disconnectingDirective(log, 'left') : nothing
            }`}`}
            ${html`${html`${
              right ? disconnectingDirective(log, 'right') : nothing
            }`}`}
          `,
          container
        );
      go(true, true);
      assert.isEmpty(log);
      go(true, false);
      assert.deepEqual(log, ['disconnected-right']);
      log.length = 0;
      go(false, false);
      assert.deepEqual(log, ['disconnected-left']);
      log.length = 0;
      go(true, true);
      assert.isEmpty(log);
      go(false, true);
      assert.deepEqual(log, ['disconnected-left']);
      log.length = 0;
      go(false, false);
      assert.deepEqual(log, ['disconnected-right']);
    });

    test('directives returned from other directives can be disconnected', () => {
      const log: Array<string> = [];
      const go = (clearAll: boolean, left: boolean, right: boolean) =>
        render(
          clearAll
            ? nothing
            : html`
            ${html`${html`${passthroughDirective(
              disconnectingDirective(log, 'left'),
              left
            )}`}`}
            ${html`${html`${passthroughDirective(
              disconnectingDirective(log, 'right'),
              right
            )}`}`}
          `,
          container
        );
      go(false, true, true);
      assert.isEmpty(log);
      go(true, true, true);
      assert.deepEqual(log, ['disconnected-left', 'disconnected-right']);
      log.length = 0;
      go(false, true, true);
      assert.isEmpty(log);
      go(false, true, false);
      assert.deepEqual(log, ['disconnected-right']);
      log.length = 0;
      go(false, false, false);
      assert.deepEqual(log, ['disconnected-left']);
      log.length = 0;
      go(false, true, true);
      assert.isEmpty(log);
      go(false, false, true);
      assert.deepEqual(log, ['disconnected-left']);
      log.length = 0;
      go(false, false, false);
      assert.deepEqual(log, ['disconnected-right']);
    });

    test('directives returned from other AsyncDirectives can be disconnected', () => {
      const log: Array<string> = [];
      const go = (
        clearAll: boolean,
        leftOuter: boolean,
        leftInner: boolean,
        rightOuter: boolean,
        rightInner: boolean
      ) =>
        render(
          clearAll
            ? nothing
            : html`
            ${html`${html`${
              leftOuter
                ? disconnectingDirective(
                    log,
                    'left-outer',
                    disconnectingDirective(log, 'left-inner'),
                    leftInner
                  )
                : nothing
            }`}`}
            ${html`${html`${
              rightOuter
                ? disconnectingDirective(
                    log,
                    'right-outer',
                    disconnectingDirective(log, 'right-inner'),
                    rightInner
                  )
                : nothing
            }`}`}
          `,
          container
        );
      go(false, true, true, true, true);
      assert.isEmpty(log);
      go(true, true, true, true, true);
      assert.deepEqual(log, [
        'disconnected-left-outer',
        'disconnected-left-inner',
        'disconnected-right-outer',
        'disconnected-right-inner',
      ]);
      log.length = 0;
      go(false, true, true, true, true);
      assert.isEmpty(log);
      go(false, false, true, true, true);
      assert.deepEqual(log, [
        'disconnected-left-outer',
        'disconnected-left-inner',
      ]);
      log.length = 0;
      go(false, true, true, true, true);
      assert.isEmpty(log);
      go(false, true, true, false, true);
      assert.deepEqual(log, [
        'disconnected-right-outer',
        'disconnected-right-inner',
      ]);
      log.length = 0;
      go(false, true, true, true, true);
      assert.isEmpty(log);
      go(false, true, false, true, true);
      assert.deepEqual(log, ['disconnected-left-inner']);
      log.length = 0;
      go(false, true, false, true, false);
      assert.deepEqual(log, ['disconnected-right-inner']);
    });

    test('directives can be disconnected from AttributeParts', () => {
      const log: Array<string> = [];
      const go = (x: boolean) =>
        render(
          x ? html`<div foo=${disconnectingDirective(log)}></div>` : nothing,
          container
        );
      go(true);
      assert.isEmpty(log);
      go(false);
      assert.deepEqual(log, ['disconnected']);
    });

    test('deeply nested directives can be disconnected from AttributeParts', () => {
      const log: Array<string> = [];
      const go = (x: boolean) =>
        render(
          x
            ? html`${html`<div foo=${disconnectingDirective(log)}></div>`}`
            : nothing,
          container
        );
      go(true);
      assert.isEmpty(log);
      go(false);
      assert.deepEqual(log, ['disconnected']);
    });

    test('directives can be disconnected from iterables', () => {
      const log: Array<string> = [];
      const go = (items: string[] | undefined) =>
        render(
          items
            ? items.map(
                (item) =>
                  html`<div foo=${disconnectingDirective(log, item)}></div>`
              )
            : nothing,
          container
        );
      go(['0', '1', '2', '3']);
      assert.isEmpty(log);
      go(['0', '2']);
      assert.deepEqual(log, ['disconnected-2', 'disconnected-3']);
      log.length = 0;
      go(undefined);
      assert.deepEqual(log, ['disconnected-0', 'disconnected-2']);
    });

    test('directives can be disconnected from repeat', () => {
      const log: Array<string> = [];
      const go = (items: string[] | undefined) =>
        render(
          items
            ? repeat(
                items,
                (item) => item,
                (item) =>
                  html`<div foo=${disconnectingDirective(log, item)}></div>`
              )
            : nothing,
          container
        );
      go(['0', '1', '2', '3']);
      assert.isEmpty(log);
      go(['0', '2']);
      assert.deepEqual(log, ['disconnected-1', 'disconnected-3']);
      log.length = 0;
      go(undefined);
      assert.deepEqual(log, ['disconnected-0', 'disconnected-2']);
    });

    test('directives in ChildParts can be reconnected', () => {
      const log: Array<string> = [];
      const go = (left: boolean, right: boolean) => {
        return render(
          html`
            ${html`${html`${
              left ? disconnectingDirective(log, 'left') : nothing
            }`}`}
            ${html`${html`${
              right ? disconnectingDirective(log, 'right') : nothing
            }`}`}
          `,
          container
        );
      };
      const part = go(true, true);
      assert.isEmpty(log);
      part.setConnected(false);
      assert.deepEqual(log, ['disconnected-left', 'disconnected-right']);
      log.length = 0;
      part.setConnected(true);
      assert.deepEqual(log, ['reconnected-left', 'reconnected-right']);
      log.length = 0;
      go(true, false);
      assert.deepEqual(log, ['disconnected-right']);
      log.length = 0;
      part.setConnected(false);
      assert.deepEqual(log, ['disconnected-left']);
      log.length = 0;
      part.setConnected(true);
      assert.deepEqual(log, ['reconnected-left']);
    });

    test('directives in AttributeParts can be reconnected', () => {
      const log: Array<string> = [];
      const go = (left: boolean, right: boolean) => {
        return render(
          html`
            ${html`${html`<div a=${
              left ? disconnectingDirective(log, 'left') : nothing
            }></div>`}`}
            ${html`${html`<div a=${
              right ? disconnectingDirective(log, 'right') : nothing
            }></div>`}`}
          `,
          container
        );
      };
      const part = go(true, true);
      assert.isEmpty(log);
      part.setConnected(false);
      assert.deepEqual(log, ['disconnected-left', 'disconnected-right']);
      log.length = 0;
      part.setConnected(true);
      assert.deepEqual(log, ['reconnected-left', 'reconnected-right']);
      log.length = 0;
      go(true, false);
      assert.deepEqual(log, ['disconnected-right']);
      log.length = 0;
      part.setConnected(false);
      assert.deepEqual(log, ['disconnected-left']);
      log.length = 0;
      part.setConnected(true);
      assert.deepEqual(log, ['reconnected-left']);
    });

    test('directives in iterables can be reconnected', () => {
      const log: Array<string> = [];
      const go = (left: unknown[], right: unknown[]) => {
        return render(
          html`
            ${html`${html`${left.map(
              (i) =>
                html`<div>${disconnectingDirective(log, `left-${i}`)}</div>`
            )}`}`}
            ${html`${html`${right.map(
              (i) =>
                html`<div>${disconnectingDirective(log, `right-${i}`)}</div>`
            )}`}`}
          `,
          container
        );
      };
      const part = go([0, 1], [0, 1]);
      assert.isEmpty(log);
      part.setConnected(false);
      assert.deepEqual(log, [
        'disconnected-left-0',
        'disconnected-left-1',
        'disconnected-right-0',
        'disconnected-right-1',
      ]);
      log.length = 0;
      part.setConnected(true);
      assert.deepEqual(log, [
        'reconnected-left-0',
        'reconnected-left-1',
        'reconnected-right-0',
        'reconnected-right-1',
      ]);
      log.length = 0;
      go([0], []);
      assert.deepEqual(log, [
        'disconnected-left-1',
        'disconnected-right-0',
        'disconnected-right-1',
      ]);
      log.length = 0;
      part.setConnected(false);
      assert.deepEqual(log, ['disconnected-left-0']);
      log.length = 0;
      part.setConnected(true);
      assert.deepEqual(log, ['reconnected-left-0']);
    });

    test('directives in repeat can be reconnected', () => {
      const log: Array<string> = [];
      const go = (left: unknown[], right: unknown[]) => {
        return render(
          html`
            ${html`${html`${repeat(
              left,
              (i) =>
                html`<div>${disconnectingDirective(log, `left-${i}`)}</div>`
            )}`}`}
            ${html`${html`${repeat(
              right,
              (i) =>
                html`<div>${disconnectingDirective(log, `right-${i}`)}</div>`
            )}`}`}
          `,
          container
        );
      };
      const part = go([0, 1], [0, 1]);
      assert.isEmpty(log);
      part.setConnected(false);
      assert.deepEqual(log, [
        'disconnected-left-0',
        'disconnected-left-1',
        'disconnected-right-0',
        'disconnected-right-1',
      ]);
      log.length = 0;
      part.setConnected(true);
      assert.deepEqual(log, [
        'reconnected-left-0',
        'reconnected-left-1',
        'reconnected-right-0',
        'reconnected-right-1',
      ]);
      log.length = 0;
      go([0], []);
      assert.deepEqual(log, [
        'disconnected-left-1',
        'disconnected-right-0',
        'disconnected-right-1',
      ]);
      log.length = 0;
      part.setConnected(false);
      assert.deepEqual(log, ['disconnected-left-0']);
      log.length = 0;
      part.setConnected(true);
      assert.deepEqual(log, ['reconnected-left-0']);
    });
  });

  // suite('spread', () => {
  //   test('renders a static attr result', () => {
  //     render(html`<div ${attr`foo=bar`} a="b"></div>`, container);
  //     assert.equal(
  //       stripExpressionComments(container.innerHTML),
  //       '<div a="b" foo="bar"></div>'
  //     );
  //   });

  //   test('renders a dynamic attr result', () => {
  //     render(html`<div ${attr`foo=${'bar'}`} a="b"></div>`, container);
  //     assert.equal(
  //       stripExpressionComments(container.innerHTML),
  //       '<div a="b" foo="bar"></div>'
  //     );
  //   });

  //   test.skip('renders a property', () => {
  //     render(html`<div ${attr`.foo=${'bar'}`} a="b"></div>`, container);
  //     assert.equal(
  //       stripExpressionComments(container.innerHTML),'<div a="b"></div>'
  //     );
  //     const div = container.querySelector('div');
  //     assert.equal((div as any).foo, 'bar');
  //   });
  // });

  let securityHooksSuiteFunction:
    | Mocha.SuiteFunction
    | Mocha.PendingSuiteFunction = suite;
  if (!DEV_MODE) {
    securityHooksSuiteFunction = suite.skip;
  }
  securityHooksSuiteFunction('enahnced security hooks', () => {
    class FakeSanitizedWrapper {
      sanitizeTo: string;
      constructor(sanitizeTo: string) {
        this.sanitizeTo = sanitizeTo;
      }

      toString() {
        return `FakeSanitizedWrapper(${this.sanitizeTo})`;
      }
    }
    const sanitizerCalls: Array<{
      name: string;
      type: 'property' | 'attribute' | 'text';
      nodeName: string;
      values: readonly unknown[];
    }> = [];
    const testSanitizer = (value: unknown) => {
      if (value instanceof FakeSanitizedWrapper) {
        return value.sanitizeTo;
      }
      return 'safeString';
    };
    const testSanitizerFactory: SanitizerFactory = (node, name, type) => {
      const values: unknown[] = [];
      sanitizerCalls.push({values, name, type, nodeName: node.nodeName});
      return (value) => {
        values.push(value);
        return testSanitizer(value);
      };
    };
    setup(() => {
      render.setSanitizer(testSanitizerFactory);
    });
    teardown(() => {
      render._testOnlyClearSanitizerFactoryDoNotCallOrElse();
      sanitizerCalls.length = 0;
    });

    test('sanitizes text content when the text is alone', () => {
      const getTemplate = (value: unknown) => html`<div>${value}</div>`;
      render(getTemplate('foo'), container);
      assert.equal(
        stripExpressionMarkers(container.innerHTML),
        '<div>safeString</div>'
      );

      const safeFoo = new FakeSanitizedWrapper('foo');
      render(getTemplate(safeFoo), container);
      assert.equal(
        stripExpressionMarkers(container.innerHTML),
        '<div>foo</div>'
      );

      assert.deepEqual(sanitizerCalls, [
        {
          values: ['foo', safeFoo],
          name: 'data',
          type: 'property',
          nodeName: '#text',
        },
      ]);
    });

    test('sanitizes text content when the text is interpolated', () => {
      const getTemplate = (value: unknown) =>
        html`<div>hello ${value} world</div>`;
      render(getTemplate('big'), container);
      assert.equal(
        stripExpressionMarkers(container.innerHTML),
        '<div>hello safeString world</div>'
      );

      const safeBig = new FakeSanitizedWrapper('big');

      render(getTemplate(safeBig), container);
      assert.equal(
        stripExpressionMarkers(container.innerHTML),
        '<div>hello big world</div>'
      );

      assert.deepEqual(sanitizerCalls, [
        {
          values: ['big', safeBig],
          name: 'data',
          type: 'property',
          nodeName: '#text',
        },
      ]);
    });

    test('sanitizes full attribute values', () => {
      const getTemplate = (value: unknown) => html`<div attrib=${value}></div>`;
      render(getTemplate('bad'), container);
      assert.equal(
        stripExpressionMarkers(container.innerHTML),
        '<div attrib="safeString"></div>'
      );

      const safe = new FakeSanitizedWrapper('good');
      render(getTemplate(safe), container);
      assert.equal(
        stripExpressionMarkers(container.innerHTML),
        '<div attrib="good"></div>'
      );

      assert.deepEqual(sanitizerCalls, [
        {
          values: ['bad', safe],
          name: 'attrib',
          type: 'attribute',
          nodeName: 'DIV',
        },
      ]);
    });

    test('sanitizes concatonated attributes after contatonation', () => {
      render(html`<div attrib="hello ${'big'} world"></div>`, container);
      assert.equal(
        stripExpressionMarkers(container.innerHTML),
        '<div attrib="safeString"></div>'
      );

      assert.deepEqual(sanitizerCalls, [
        {
          values: ['hello big world'],
          name: 'attrib',
          type: 'attribute',
          nodeName: 'DIV',
        },
      ]);
    });

    test('sanitizes properties', () => {
      const getTemplate = (value: unknown) => html`<div .foo=${value}></div>`;
      render(getTemplate('bad'), container);
      assert.equal(stripExpressionMarkers(container.innerHTML), '<div></div>');
      assert.equal((container.querySelector('div')! as any).foo, 'safeString');

      const safe = new FakeSanitizedWrapper('good');
      render(getTemplate(safe), container);
      assert.equal(stripExpressionMarkers(container.innerHTML), '<div></div>');
      assert.equal((container.querySelector('div')! as any).foo, 'good');

      assert.deepEqual(sanitizerCalls, [
        {values: ['bad', safe], name: 'foo', type: 'property', nodeName: 'DIV'},
      ]);
    });
  });

  suite('internal', () => {
    test('clearContainerForLit2MigrationOnly', () => {
      container.innerHTML = '<div>TEST</div>';
      render(html`<p>HELLO</p>`, container, {
        clearContainerForLit2MigrationOnly: true,
      } as RenderOptions);
      assert.equal(
        stripExpressionComments(container.innerHTML),
        INTERNAL ? '<p>HELLO</p>' : '<div>TEST</div><p>HELLO</p>'
      );
    });
  });
});
