/**
 * @license
 * Copyright (c) 2020 The Polymer Project Authors. All rights reserved.
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

import fs from 'fs';
import path from 'path';
import tachPkg from 'tachometer/lib/cli.js';
const {main: tachometer} = tachPkg;
import tablePkg from 'table';
const {table, getBorderCharacters} = tablePkg;
import rimraf from 'rimraf';
import cliArgs from 'command-line-args';

import {getOptions, OptionKey, OptionValues} from './options.js';
import {getRenderers, TemplateRenderer} from './renderers.js';
import {deoptigate, deoptigateFolderForUrl} from './deoptigate.js';
import {nextLevel, depthForLevel, levelForTemplate, templateNameForLevel, parseRenderer} from './utils.js';

// Options and renderers are circular, so pass a dummy options
// so we can change it once we parse the command line args
const prettyOptions = {pretty: false};
const renderers = getRenderers(prettyOptions);

const {
  optionsDesc,
  options,
  reportOptions,
  variedOptions,
  variations,
  rendererForName
} = getOptions(renderers);

prettyOptions.pretty = options.pretty;

// Generates a full benchmark html page + js script for a given set of options
const generateBenchmark = (opts: OptionValues, outputPath: string, name: string) => {

  console.log(`Generating variant ${name}`);

  const renderer = rendererForName(parseRenderer(opts.renderers).base)!;
  const generatedTemplates = new Set();

  // Generates a template for a given level
  const generateTemplate = (
    s: string = '',
    templateLevel: string = '',
    tag: string = 'div') => {

    const staticAttrPerNode = Math.floor((1 - opts.dynAttrPct) * opts.attrPerNode);
    const staticNodesPerNode = Math.floor((1 - opts.dynNodePct) * opts.width);
    const constantAttrPerNode = Math.floor((1 - opts.updateAttrPct) * (opts.attrPerNode - staticAttrPerNode));
    const constantNodesPerNode = Math.floor((1 - opts.updateNodePct) * (opts.width - staticNodesPerNode));

    // Generates a tree of either static or dynamic nodes (template calls) at a
    // given level
    const generateTree = (s: string, renderer: TemplateRenderer, parentLevel: string = '') => {
      for (let i=0; i<opts.width; i++) {
        const level = nextLevel(parentLevel, i);
        s = renderer.openTagStart(s, level, tag, opts.attrPerNode, staticAttrPerNode);
        for (let j=0; j<opts.attrPerNode; j++) {
          const isStatic = j < staticAttrPerNode;
          const isConstant = isStatic || ((j - staticAttrPerNode) < constantAttrPerNode)
          const name = nextLevel(level, j);
          s = renderer.setAttr(s, level, name, isStatic, isConstant, Math.max(opts.valPerDynAttr, 1));
        }
        s = renderer.openTagEnd(s, level, tag, opts.attrPerNode);
        s = renderer.textNode(s, level, false, level);
        if (depthForLevel(level) < opts.depth) {
          if (i < staticNodesPerNode) {
            s = generateTree(s, renderer, level);
          } else {
            const isConstant = (i - staticNodesPerNode) < constantNodesPerNode;
            const name = templateNameForLevel(level, !!opts.uniqueTemplates, (isConstant ? '' : 'A'));
            if (opts.uniqueTemplates || !generatedTemplates.has(name)) {
              generatedTemplates.add(name);
              // Prepend generated templates to the start of the script
              s = generateTemplate(s, level + (isConstant ? '' : 'A'), 'div');
              if (!isConstant) {
                const name = levelForTemplate(level, !!opts.uniqueTemplates, 'B');
                if (opts.uniqueTemplates || !generatedTemplates.has(name)) {
                  generatedTemplates.add(name);
                  s = generateTemplate(s, level + 'B', 'p');
                }
              }
            }
            // Emit a call to the generated/prepended template
            s = renderer.callTemplate(s, level, templateNameForLevel(level, !!opts.uniqueTemplates), isConstant);
          }
        }
        s = renderer.closeTag(s, level, tag);
      }
      return s;
    };

    let t = '';
    t = renderer.startTemplate(t, templateNameForLevel(templateLevel, !!opts.uniqueTemplates));
    t = generateTree(t, renderer, templateLevel);
    t = renderer.endTemplate(t);
    return t + s;
  };

  const generatedByComment = `Benchmark generated via the following invocation:\n` + 
    `node generator/build/index.js ${process.argv.slice(2).join(' ')}\n\n` + 
    `Parameters:\n${Object.entries(opts)
      .filter(([p]) => !optionsDesc[p as keyof typeof optionsDesc].noReport)
      .map(([p,v]) => `  ${p}: ${v}`).join('\n')}`;

  // Output benchmark script file
  const script = `
/*\n${generatedByComment}\n*/
${renderer.startBenchmark(parseRenderer(opts.renderers).base)}
${generateTemplate()}
const container = document.getElementById('container');
let updateId = 0;
let useTemplateA = true;
window.update = () => {
  ${renderer.render()}
  updateId++;
  useTemplateA = !useTemplateA;
}
performance.mark('initial-render-start');
window.update();
performance.mark('initial-render-end');
for (let i=0; i<${opts.updateCount}; i++) {
  window.update();
}
performance.mark('updates-end');
performance.measure('render', 'initial-render-start', 'initial-render-end');
performance.measure('update', 'initial-render-end', 'updates-end');
performance.measure('time', 'initial-render-start', 'updates-end');
${
  opts.measure === 'memory' ?
    `window.tachometerResult = performance.memory.usedJSHeapSize/1024;` :
    `window.tachometerResult = performance.getEntriesByName('render')[0].duration +
      performance.getEntriesByName('update')[0].duration;`
}
document.title = window.tachometerResult.toFixed(2) + 'ms';
`;
  fs.writeFileSync(path.join(outputPath, name + '.js'), script, 'utf-8');                

  // Output benchmark html file
  const html = `<!DOCTYPE html>
<!--\n${generatedByComment}\n-->
<html>
<head>
</head>
<body>
<div id="container"></div>
${renderer.legacyScripts ? renderer.legacyScripts.map(s => 
  `<script src="${s}"></script>`).join('\n') : ''}
<script type="module" src="${name + '.js'}"></script>
</body>
</html>`;
  fs.writeFileSync(path.join(outputPath, name + '.html'), html, 'utf-8');                
};

// Pretty printing of option values for reporting
const formatOptionValue = (v: any) => {
  v = Array.isArray(v) ? v[0] : v; // For logging constant options
  if (typeof v === 'number' && (v % 1 !== 0)) {
    return v.toFixed(1);
  } else if (typeof v === 'boolean') {
    return v.toString()[0];
  } else {
    return String(v);
  }
};

// Use CLI alias for each option that differed to construct a terse
// moniker for the unique variation, used in filename & reporting
const nameForVariation = (variation: OptionValues) => {
  return reportOptions.map((option) => {
    if (option === 'renderers') {
      return parseRenderer(variation.renderers).base;
    } else {
      return `${optionsDesc[option].alias}${formatOptionValue(variation[option])}`;
    }
  }).join('-');
};

// Similar to nameForVariation, but includes options that varied
const shortNameForVariation = (variation: OptionValues) => {
  return variedOptions.map(option => {
    if (option === 'renderers') {
      return parseRenderer(variation.renderers).base;
    } else {
      return `${optionsDesc[option].alias}${formatOptionValue(variation[option])}`;
    }
  }).join('-');
};

// Log the options that were held constant along with the benchmark results so
// it's easy to capture what the run was testing (only the varied options are
// included in the benchmark name itself, to keep the table columns as narrow as
// possible)
const printConstantOptions = (options: cliArgs.CommandLineOptions) => {
  const keys = reportOptions.filter(arg => variedOptions.indexOf(arg) < 0);
  console.log('Held constant between variations:');
  console.log(table([
    keys,
    keys.map(arg => formatOptionValue(options[arg]))
  ], {
    border: getBorderCharacters('norc'),
  }));
}

const outputPath = path.join(process.cwd(), options.output);

// Create the output folder if it does not exist
if (fs.existsSync(outputPath)) {
  if (options.clean) {
  // Remove all generated HTML files from the generated folder
    rimraf.sync(outputPath);
    fs.mkdirSync(outputPath);
  }
} else {
  fs.mkdirSync(outputPath);
}

// Main routine to generate all benchmarks, index.html, & tachometer.json
async function generateAll() {

  let measurement;
  if (options.measure === 'memory') {
    measurement = 'global';
  } else {
    measurement = options.measure.split(',').map((m: string) => ({
      "mode": "performance",
      "entryName": m.trim()
    }))
  }

  const tach = {
    "$schema": "https://raw.githubusercontent.com/Polymer/tachometer/master/config.schema.json",
    "timeout": 0,
    "sampleSize": options.deoptigate ? 2 : options.sampleSize,
    "benchmarks": [{
      "measurement": measurement,
      "browser": {
        "headless": true,
        "name": "chrome",
        "addArguments": [],
      },
      "expand": []
    }],
  };
  // Pointer into tachometer.json object to add benchmarks to
  const tachList = tach.benchmarks[0].expand as any;
  const browserArguments = (tach.benchmarks[0].browser as any).addArguments;

  // Note `performance.memory.usedJSHeapSize` does not actually change without
  // this flag
  if (options.measure === 'memory') {
    browserArguments.push("--enable-precise-memory-info");
  }

  // index.html preamble
  let index = `<style>table,th,td { padding: 3px; border: 1px solid black; border-collapse: collapse;}</style><table>`;
  index += `<tr>${reportOptions.map(arg => `<td>${arg}</td>`).join('')}<td>URL</td>${options.deoptigate ? `<td>Deopt</td>` : ''}</tr>`;

  // Loop over cartesian product of all options and output benchmarks
  const urls = [];
  const files = new Set();
  for (const variation of variations) {
    const variant = (Object.keys(options) as OptionKey[])
      .reduce((v: any, arg: OptionKey, i: number) => (v[arg] = variation[i], v), {});
    const fullName = nameForVariation(variant);
    const shortName = shortNameForVariation(variant);
    const name = options.shortname ?
      `${options.shortname}${shortName ? `-${shortName}` : ''}` : 
      `benchmark-${fullName}`
    const filename = `${name}.html`;
    const {query, packageVersions} = parseRenderer(variant.renderers);
    const url = filename + (query ? '?' + query : '');
    urls.push(url);
    index += `<tr>${reportOptions.map(opt => `<td>${formatOptionValue(variant[opt])}</td>`).join('')}`;
    index += `<td><a href="${url}">${url}</a></td>`
    index += `${options.deoptigate ? `<td><a href="${deoptigateFolderForUrl(url)}/index.html">Deopt</a></td>` : ''}`
    index += `</tr>`;
    const urlPath = path.relative(process.cwd(), outputPath);
    const tachInfo = {name: shortName || options.shortname || '(single)', url: `${urlPath}/${url}`} as any;
    if (packageVersions) {
      tachInfo.packageVersions = packageVersions;
    }
    tachList.push(tachInfo);
    // Dedupe files called with differing query strings
    if (!files.has(filename)) {
      files.add(filename);
      generateBenchmark(variant, outputPath, name);
    }
  }
  if (!options.generateOnlyBenchmarks || options.runTachometer) {
    console.log(`Generating tachometer.json...`);
    fs.writeFileSync(path.join(outputPath, 'tachometer.json'), JSON.stringify(tach, null, '  '), 'utf-8');
  }
  if (options.generateIndex) {
    console.log(`Generating index.html...`);
    fs.writeFileSync(path.join(outputPath, 'index.html'), index + '</table>', 'utf-8');
  }
  console.log('Done.');

  // Run the benchmarks!
  if (options.runDeoptigate) {
    for (const url of urls) {
      await deoptigate(options.output, url);
    }
  } else if (options.runTachometer) {
    await tachometer([
      '--config', path.join(outputPath, 'tachometer.json'),
      '--csv-file', path.join(outputPath, 'results.csv'),
      '--json-file', path.join(outputPath, 'results.json'),
    ]);
    printConstantOptions(options);
  }
}

generateAll();