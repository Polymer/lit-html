/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {defaultMsg} from './default-msg.js';
import {joinStringsAndValues} from './str-tag.js';
import {generateMsgId} from './id-generation.js';

import type {TemplateLike, MsgOptions, TemplateMap} from './types.js';
import type {TemplateResult} from 'lit';

const expressionOrders = new WeakMap<TemplateResult, number[]>();
const hashCache = new Map<TemplateStringsArray | string, string>();

export function runtimeMsg(
  templates: TemplateMap | undefined,
  template: TemplateLike,
  options: MsgOptions | undefined
): string | TemplateResult {
  if (templates) {
    const id = options?.id ?? generateId(template);
    const localized = templates[id];
    if (localized) {
      if (typeof localized === 'string') {
        // E.g. "Hello World!"
        return localized;
      } else if ('strTag' in localized) {
        // E.g. str`Hello ${name}!`
        //
        // Localized templates have ${number} in place of real template
        // expressions. They can't have real template values, because the
        // variable scope would be wrong. The number tells us the index of the
        // source value to substitute in its place, because expressions can be
        // moved to a different position during translation.
        return joinStringsAndValues(
          localized.strings,
          // Cast `template` because its type wasn't automatically narrowed (but
          // we know it must be the same type as `localized`).
          (template as TemplateResult).values,
          localized.values as number[]
        );
      } else {
        // E.g. html`Hello <b>${name}</b>!`
        //
        // We have to keep our own mapping of expression ordering because we do
        // an in-place update of `values`, and otherwise we'd lose ordering for
        // subsequent renders.
        let order = expressionOrders.get(localized);
        if (order === undefined) {
          order = localized.values as number[];
          expressionOrders.set(localized, order);
        }
        // Cast `localized.values` because it's readonly.
        (localized as {
          values: TemplateResult['values'];
        }).values = order.map((i) => (template as TemplateResult).values[i]);
        return localized;
      }
    }
  }
  return defaultMsg(template);
}

function generateId(template: TemplateLike): string {
  const strings = typeof template === 'string' ? template : template.strings;
  let id = hashCache.get(strings);
  if (id === undefined) {
    id = generateMsgId(
      strings,
      typeof template !== 'string' && !('strTag' in template)
    );
    hashCache.set(strings, id);
  }
  return id;
}
