import {isSourceMap, adjustSources} from '../utils.js';
import {sep} from 'path';
import {test} from 'uvu';
import * as assert from 'uvu/assert';

test('isSourceMap', async () => {
  const result = [
    isSourceMap('file.d.ts.map'),
    isSourceMap('/path/to/file.d.ts.map'),
    isSourceMap('file.d.ts'),
    isSourceMap('/path/to/file.d.ts'),
  ];
  assert.equal(result, [true, true, false, false]);
});

test('adjustSources: /development/index.d.ts.map to index.d.ts.map', async () => {
  const original = `root${sep}development${sep}index.d.ts.map`;
  const mirror = `root${sep}index.d.ts.map`;
  const sources = ['../src/index.ts'];
  const expectedResult = ['./src/index.ts'];
  const result = adjustSources(original, mirror, sources);
  assert.equal(result, expectedResult);
});

test('adjustSources: /development/folder/index.d.ts.map to folder/index.d.ts.map', async () => {
  const original = `root${sep}development${sep}folder${sep}index.d.ts.map`;
  const mirror = `root${sep}folder${sep}index.d.ts.map`;
  const sources = ['../../src/folder/index.ts'];
  const expectedResult = ['../src/folder/index.ts'];
  const result = adjustSources(original, mirror, sources);
  assert.equal(result, expectedResult);
});

test.run();
