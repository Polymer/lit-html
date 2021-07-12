import * as fs from 'fs/promises';
import * as pathlib from 'path';

export function isSourceMap(source: string) {
  return pathlib.basename(source).slice(-4) === '.map';
}

export function adjustSources(
  original: string,
  mirror: string,
  sources: string[]
) {
  const originalDir = pathlib.dirname(original);
  const mirrorDir = pathlib.dirname(mirror);
  return sources.map((source) => {
    const sourceAbsolute = pathlib.join(originalDir, source);
    const sourceRelativeToMirror = pathlib.relative(mirrorDir, sourceAbsolute);
    const sourceRelativeToMirrorPosix = sourceRelativeToMirror
      .split(pathlib.sep)
      .join(pathlib.posix.sep);
    const sourceAdjusted =
      sourceRelativeToMirrorPosix.charAt(0) !== '.'
        ? './' + sourceRelativeToMirrorPosix
        : sourceRelativeToMirrorPosix;
    return sourceAdjusted;
  });
}

export async function writeAdjustedSourceMap(original: string, mirror: string) {
  const data = await fs.readFile(original, 'utf-8');
  const dataJSON = JSON.parse(data);
  dataJSON.sources = adjustSources(original, mirror, dataJSON.sources);
  await fs.writeFile(mirror, JSON.stringify(dataJSON));
}
