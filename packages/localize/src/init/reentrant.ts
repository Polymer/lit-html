/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {_installMsgImplementation} from '../lit-localize.js';
import {runtimeMsg} from '../internal/runtime-msg.js';

import type {
  TemplateLike,
  MsgFn,
  LocaleModule,
  MsgOptions,
} from '../internal/types.js';

/**
 * Configuration parameters for lit-localize when in reentrant mode.
 */
export interface ReentrantConfiguration {
  /**
   * Required locale code in which source templates in this project are written,
   * and the active locale.
   */
  sourceLocale: string;

  /**
   * Required locale codes that are supported by this project. Should not
   * include the `sourceLocale` code.
   */
  targetLocales: string[];

  /**
   * Required function that determines the currently active locale, called
   * before every msg() call.
   */
  getLocale: () => string;

  /**
   * Required function that synchronously returns the localized templates for
   * the given locale code.
   *
   * This function will only ever be called with a `locale` that is contained by
   * `targetLocales`.
   */
  loadLocaleSync: (locale: string) => LocaleModule | undefined;
}

/**
 * Set configuration parameters for lit-localize when in reentrant mode.
 *
 * Throws if called more than once.
 */
export const configureReentrantLocalization: ((
  config: ReentrantConfiguration
) => {}) & {
  _LIT_LOCALIZE_CONFIGURE_LOCALIZATION_?: never;
} = ({
  sourceLocale,
  targetLocales,
  getLocale,
  loadLocaleSync,
}: ReentrantConfiguration) => {
  const targetLocalesSet = new Set(targetLocales);
  _installMsgImplementation(((template: TemplateLike, options?: MsgOptions) => {
    const locale = getLocale();
    const templates =
      locale !== sourceLocale && targetLocalesSet.has(locale)
        ? loadLocaleSync(locale)?.templates
        : undefined;
    return runtimeMsg(templates, template, options);
  }) as MsgFn);
  return {};
};
