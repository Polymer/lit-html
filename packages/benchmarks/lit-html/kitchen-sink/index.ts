/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Kitchen-sink benchmark for lit-html
 *
 * Features exercised:
 * - ChildPart
 *   - value: string
 *   - value: Node
 *   - value: Array<TemplateResult>
 *   - value: directive: repeat
 *   - value: nothing
 * - AttributePart
 *   - value: string (single)
 *   - value: string (multiple)
 *   - value: directive: classMap
 *   - value: directive: styleMap
 * - PropertyPart
 *   - value: object
 * - EventPart
 *   - value: function
 * - Comment binding
 *   - value: string
 *
 * Available query params:
 * - width: number of items in each map/repeat per item
 * - depth: number of levels of item recursion
 * - updateCount: number of times to update with changed data after initial render
 * - nopUpdateCount: number of times to update with unchanged data after initial render
 *
 * The following performance measurements are recorded:
 * - `render` - time for initial render
 * - `update` - time for running through `updateCount` updates
 * - `nop-update` - time for running through `nopUpdateCount` nop-updates
 */

import {html, render, nothing} from 'lit-html';
import {repeat} from 'lit-html/directives/repeat.js';
import {classMap} from 'lit-html/directives/class-map.js';
import {styleMap} from 'lit-html/directives/style-map.js';
import {queryParams} from '../../utils/query-params.js';

// Configurable params
const width = queryParams.width ?? 4;
const depth = queryParams.depth ?? 4;
const updateCount = queryParams.updateCount ?? 10;
const nopUpdateCount = queryParams.nopUpdateCount ?? 10;

// Data model
interface Data {
  key: number;
  text: string;
  property: unknown;
  classes: Record<string, boolean>;
  style: Record<string, string>;
  node: Node;
  handler: () => void;
  childData?: Data[];
  useRepeat?: boolean;
}

/**
 * Generates a data model for an item, recursively creating child data
 * models for the given width & depth.
 *
 * @param updateId Increment to ensure new data models for the given id
 *     create unique (non-dirty checking) values
 * @param id Id for item, unique amongst its peers
 * @param parent Parent moniker (to create unique text for each item)
 * @param currentDepth Current depth, used to stop recursion at REPEAT_DEPTH.
 */
const generateData = (
  updateId = 0,
  id = 0,
  parent: string | undefined = undefined,
  currentDepth = 0
): Data => {
  const moniker = `${parent ? `${parent}-` : ''}${id}`;
  return {
    key: id,
    text: `Item ${moniker}${updateId ? `#${updateId}` : ''}`,
    property: {},
    node: document.createElement('span'),
    classes: {
      foo: !!(updateId % 2),
      bar: !(updateId % 2),
      ziz: true,
      zaz: false,
    },
    style: {
      'border-top-width': `${updateId % 2}px`,
      'border-bottom-width': `${(updateId + 1) % 2}px`,
      'border-left-width': '0px',
      'border-right-width': '0px',
    },
    handler: () => {},
    ...(currentDepth < depth && {
      childData: new Array(width)
        .fill(0)
        .map((_, i) => generateData(updateId, i, moniker, currentDepth + 1)),
      useRepeat: !(id % 2),
    }),
  };
};

/**
 * Renders a lit-html template for the given data model; will recursively
 * create child items using either repeat or map, alternating between items.
 *
 * The goal here is to try to exercise each feature of lit-html at least once,
 * hence kitchen-sink.
 *
 * @param data Data model for item
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderItem: any = (data: Data) => html`
  <div class="${classMap(data.classes)} static" style=${styleMap(data.style)}>
    ${data.text}
    <!-- Comment binding ${data.text} -->
    <div .property=${data.property} attr=${data.text} multi="~${data.text}~${
  data.text
}~${data.text}~"></div>
    <div @click=${data.handler}></div>
    ${data.node}
    <!-- Make sure to have a decent ratio of static:dynamic nodes  -->
    <div class="foo bar baz">
      <div class="foo bar baz"></div>
      <div><span></span></div>
      <div class="foo bar baz"></div>
      <div><span></span></div>
      <div class="foo bar baz"></div>
    </div>
    <div class="foo bar baz"></div>
    ${
      data.childData
        ? html`<div mode="${data.useRepeat ? 'repeat' : 'map'}">
            ${data.useRepeat
              ? repeat(
                  data.childData,
                  (item) => item.key,
                  (item) => renderItem(item)
                )
              : data.childData.map((item) => renderItem(item))}
          </div>`
        : nothing
    }
    </div>
  </div>
  `;

const data = generateData(0);

// Named functions are use to run the measurements so that they can be selected
// in the DevTools profile flame chart.

// Initial render
const initialRender = () => {
  performance.mark('render-start');
  render(renderItem(data), document.body);
  performance.measure('render', 'render-start');
};
initialRender();

// Update
// Calculate update data outside of measurement to reduce minor GC of the data
const updateData: Array<Data> = [];
for (let i = 0; i < updateCount; i++) {
  updateData.push(generateData(i + 1));
}
const update = () => {
  performance.mark('update-start');
  for (let i = 0; i < updateCount; i++) {
    render(renderItem(updateData[i]), document.body);
  }
  performance.measure('update', 'update-start');
};
update();

// No-op update
// Reset rendering to initial data so the measured render is a no-op
render(renderItem(data), document.body);
const noopUpdate = () => {
  performance.mark('nop-update-start');
  for (let i = 0; i < nopUpdateCount; i++) {
    render(renderItem(data), document.body);
  }
  performance.measure('nop-update', 'nop-update-start');
};
noopUpdate();

// Log
console.log(
  Object.entries({width, depth, updateCount, nopUpdateCount})
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ')
);
console.log('===');
performance
  .getEntriesByType('measure')
  .forEach((m) => console.log(`${m.name}: ${m.duration.toFixed(3)}ms`));
