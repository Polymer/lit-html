/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {AsyncLocalStorage} from 'async_hooks';
import {configureReentrantLocalization} from '@lit/localize/init/reentrant.js';

import type {LocaleModule} from '@lit/localize';

/**
 * Configuration parameters for lit-localize when in SSR mode.
 */
export interface SsrConfiguration {
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
   * Required function that returns the localized templates for the given locale
   * code.
   *
   * This function will only ever be called with a `locale` that is contained by
   * `targetLocales`.
   */
  loadLocale: (locale: string) => Promise<LocaleModule | undefined>;
}

/**
 * Set configuration parameters for lit-localize when in SSR mode.
 *
 * Throws if called more than once.
 */
export const configureSsrLocalization = async ({
  sourceLocale,
  targetLocales,
  loadLocale,
}: SsrConfiguration) => {
  const translations = new Map<string, LocaleModule | undefined>(
    await Promise.all(
      targetLocales.map(
        async (locale): Promise<[string, LocaleModule | undefined]> => [
          locale,
          await loadLocale(locale),
        ]
      )
    )
  );
  const storage = new AsyncLocalStorage<string>();
  configureReentrantLocalization({
    sourceLocale,
    targetLocales,
    getLocale: () => storage.getStore()!,
    loadLocaleSync: (locale) => translations.get(locale),
  });
  const withLocale = (locale: string, callback: () => void) =>
    storage.run(locale, callback);
  return {
    withLocale,
  };
};
