/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {test} from 'uvu';
import * as assert from 'uvu/assert';

import {extractMessagesFromProgram} from '../program-analysis.js';
import {ProgramMessage} from '../messages.js';
import ts from 'typescript';
import {
  createTsProgramFromFragment,
  CompilerHostCache,
} from '@lit/transformers/lib/tests/compile-ts-fragment.js';

const cache = new CompilerHostCache();

/**
 * Analyze the given fragment of TypeScript source code with the lit-localize
 * message extractors. Check that the expected extracted messages and/or
 * diagnostics are returned.
 */
function checkAnalysis(
  inputTs: string,
  expectedMessages: Array<
    Pick<ProgramMessage, 'name' | 'contents'> &
      Partial<Pick<ProgramMessage, 'desc'>>
  >,
  expectedErrors: string[] = []
) {
  const options = ts.getDefaultCompilerOptions();
  options.target = ts.ScriptTarget.ES2015;
  options.module = ts.ModuleKind.ESNext;
  options.moduleResolution = ts.ModuleResolutionKind.NodeJs;
  // Don't automatically load typings from nodes_modules/@types, we're not using
  // them here, so it's a waste of time.
  options.typeRoots = [];
  const {program, host} = createTsProgramFromFragment(
    inputTs,
    '',
    options,
    cache,
    () => undefined
  );
  const {messages, errors} = extractMessagesFromProgram(program);
  assert.equal(
    errors.map((diagnostic) => ts.formatDiagnostic(diagnostic, host).trim()),
    expectedErrors
  );
  assert.equal(
    messages.map(({name, contents, desc}) => ({
      name,
      contents,
      desc,
    })),
    expectedMessages.map(({name, contents, desc}) => ({
      name,
      contents,
      desc,
    }))
  );
}

test('irrelevant code', () => {
  const src = 'const foo = "foo";';
  checkAnalysis(src, []);
});

test('string message', () => {
  const src = `
    import {msg} from '@lit/localize';
    msg('Hello World', {id: 'greeting'});
  `;
  checkAnalysis(src, [
    {
      name: 'greeting',
      contents: ['Hello World'],
    },
  ]);
});

test('string message unnecessarily tagged with str', () => {
  const src = `
    import {msg, str} from '@lit/localize';
    msg(str\`Hello World\`, {id: 'greeting'});
  `;
  checkAnalysis(src, [
    {
      name: 'greeting',
      contents: ['Hello World'],
    },
  ]);
});

test('string message (auto ID)', () => {
  const src = `
    import {msg} from '@lit/localize';
    msg('Hello World');
  `;
  checkAnalysis(src, [
    {
      name: 's3d58dee72d4e0c27',
      contents: ['Hello World'],
    },
  ]);
});

test('HTML message', () => {
  const src = `
    import {msg} from '@lit/localize';
    msg(html\`<b>Hello World</b>\`, {id: 'greeting'});
  `;
  checkAnalysis(src, [
    {
      name: 'greeting',
      contents: [
        {untranslatable: '<b>'},
        'Hello World',
        {untranslatable: '</b>'},
      ],
    },
  ]);
});

test('HTML message (auto ID)', () => {
  const src = `
    import {msg} from '@lit/localize');
    msg(html\`<b>Hello World</b>\`);
  `;
  checkAnalysis(src, [
    {
      name: 'hc468c061c2d171f4',
      contents: [
        {untranslatable: '<b>'},
        'Hello World',
        {untranslatable: '</b>'},
      ],
    },
  ]);
});

test('HTML message with comment', () => {
  const src = `
    import {msg} from '@lit/localize';
    msg(html\`<b><!-- greeting -->Hello World</b>\`, {id: 'greeting'});
  `;
  checkAnalysis(src, [
    {
      name: 'greeting',
      contents: [
        {untranslatable: '<b><!-- greeting -->'},
        'Hello World',
        {untranslatable: '</b>'},
      ],
    },
  ]);
});

test('parameterized string message', () => {
  const src = `
    import {msg, str} from '@lit/localize';
    const name = "friend";
    msg(str\`Hello \${name}\`, {id: 'greeting'});
  `;
  checkAnalysis(src, [
    {
      name: 'greeting',
      contents: ['Hello ', {untranslatable: '${name}'}],
    },
  ]);
});

test('parameterized string message (auto ID)', () => {
  const src = `
    import {msg, str} from '@lit/localize';
    const name = "friend";
    msg(str\`Hello \${name}\`);
  `;
  checkAnalysis(src, [
    {
      name: 'saed7d3734ce7f09d',
      contents: ['Hello ', {untranslatable: '${name}'}],
    },
  ]);
});

test('parameterized HTML message', () => {
  const src = `
    import {msg} from '@lit/localize';
    const name = "Friend";
    msg(html\`<b>Hello \${friend}</b>\`, {id: 'greeting'});
  `;
  checkAnalysis(src, [
    {
      name: 'greeting',
      contents: [
        {untranslatable: '<b>'},
        'Hello ',
        {untranslatable: '${friend}</b>'},
      ],
    },
  ]);
});

test('desc option (string)', () => {
  const src = `
    import {msg} from '@lit/localize';

    msg('Hello World', {
      desc: 'A greeting to Earth'
    });
  `;
  checkAnalysis(src, [
    {
      name: 's3d58dee72d4e0c27',
      contents: ['Hello World'],
      desc: 'A greeting to Earth',
    },
  ]);
});

test('desc option (no substitution literal)', () => {
  const src = `
    import {msg} from '@lit/localize';

    msg('Hello World', {
      desc: \`A greeting to Earth\`
    });
  `;
  checkAnalysis(src, [
    {
      name: 's3d58dee72d4e0c27',
      contents: ['Hello World'],
      desc: 'A greeting to Earth',
    },
  ]);
});

test('error: desc option (substitution literal)', () => {
  const src = `
    import {msg} from '@lit/localize';

    msg('Hello World', {
      desc: \`A greeting to \${'Earth'}\`
    });
  `;
  checkAnalysis(
    src,
    [],
    [
      '__DUMMY__.ts(5,13): error TS2324: ' +
        'msg desc option must be a string with no expressions',
    ]
  );
});

test('different msg function', () => {
  const src = `
    function msg(id: string, template: string) {
      return template;
    }
    msg('Greeting', {id: 'greeting'});
  `;
  checkAnalysis(src, []);
});

test('error: message id cannot be empty', () => {
  const src = `
    import {msg} from '@lit/localize';
    msg('Hello World', {id: ''});
  `;
  checkAnalysis(
    src,
    [],
    [
      '__DUMMY__.ts(3,29): error TS2324: msg id option must be a non-empty string with no expressions',
    ]
  );
});

test('error: options must be object literal', () => {
  const src = `
    import {msg} from '@lit/localize';
    const options = {id: 'greeting'};
    msg('Hello World', options);
  `;
  checkAnalysis(
    src,
    [],
    [
      '__DUMMY__.ts(4,24): error TS2324: Expected second argument to msg() to be an object literal',
    ]
  );
});

test('error: options must be long-form', () => {
  const src = `
    import {msg} from '@lit/localize';
    const id = 'greeting';
    msg('Hello World', {id});
  `;
  checkAnalysis(
    src,
    [],
    [
      '__DUMMY__.ts(4,25): error TS2324: Options object must use identifier or string literal property assignments. Shorthand and spread assignments are not supported.',
    ]
  );
});

test('error: message id must be static', () => {
  const src = `
    import {msg} from '@lit/localize';
    const id = 'greeting';
    msg('Hello World', {id: id});
    msg('Hello World', {id: \`\${id}\`});
  `;
  checkAnalysis(
    src,
    [],
    [
      '__DUMMY__.ts(4,29): error TS2324: msg id option must be a non-empty string with no expressions',
      '__DUMMY__.ts(5,29): error TS2324: msg id option must be a non-empty string with no expressions',
    ]
  );
});

test('error: different message contents', () => {
  const src = `
    import {msg} from '@lit/localize';
    msg('Hello World', {id: 'greeting'});
    msg('Hello Friend', {id: 'greeting'});
  `;
  checkAnalysis(
    src,
    [
      {
        name: 'greeting',
        contents: ['Hello World'],
      },
    ],
    [
      '__DUMMY__.ts(4,5): error TS2324: Message ids must have the same default text wherever they are used',
    ]
  );
});

test('error: string with expressions must use str tag', () => {
  const src = `
    import {msg} from '@lit/localize';
    const name = 'friend';
    msg(\`Hello \${name}\`);
  `;
  checkAnalysis(
    src,
    [],
    [
      '__DUMMY__.ts(4,9): error TS2324: String literal with expressions must use the str tag',
    ]
  );
});

test.run();
