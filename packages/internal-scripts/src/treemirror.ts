/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import fastGlob from 'fast-glob';
import * as fs from 'fs/promises';
import * as pathlib from 'path';
import {isSourceMap, writeAdjustedSourceMap} from './utils.js';

const main = async () => {
  const [, , root, dest, ...globs] = process.argv;
  if (!root || !dest || globs.length === 0) {
    console.error(
      `
USAGE
    treemirror ROOT_DIR DEST_DIR GLOB1 [GLOB2, ...]"

EXAMPLES
    To recursively copy all "d.ts" and "d.ts.map" files in the
    "development" directory to the current directory:

        treemirror development . '**/*.d.ts' '**/*.d.ts.map'
`.trim()
    );
    process.exit(1);
  }

  const matches = await fastGlob(globs, {cwd: root, absolute: true});
  const mirrors = [];
  const dirs = new Set<string>();
  for (const original of matches) {
    const mirror = pathlib.resolve(dest, pathlib.relative(root, original));
    mirrors.push({original: pathlib.normalize(original), mirror});
    dirs.add(pathlib.dirname(mirror));
  }

  await Promise.all([...dirs].map((dir) => fs.mkdir(dir, {recursive: true})));

  await Promise.all(
    mirrors.map(async ({original, mirror}) => {
      // Overwrites by default.
      if (isSourceMap(original)) {
        await writeAdjustedSourceMap(original, mirror);
        return;
      }
      await fs.copyFile(original, mirror);
    })
  );
};

main();
