/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {createRequire} from 'module';
import {playwrightLauncher} from '@web/test-runner-playwright';
import {fromRollup} from '@web/dev-server-rollup';
import {createSauceLabsLauncher} from '@web/test-runner-saucelabs';
import {legacyPlugin} from '@web/dev-server-legacy';
import {resolveRemap} from './rollup-resolve-remap.js';
import {prodResolveRemapConfig, devResolveRemapConfig} from './wtr-config.js';

const mode = process.env.MODE || 'dev';
if (!['dev', 'prod'].includes(mode)) {
  throw new Error(`MODE must be "dev" or "prod", was "${mode}"`);
}

let resolveRemapConfig;
if (mode === 'prod') {
  console.log('Using production builds');
  resolveRemapConfig = prodResolveRemapConfig;
} else {
  console.log('Using development builds');
  resolveRemapConfig = devResolveRemapConfig;
}

const browserPresets = {
  // Default set of Playwright browsers to test when running locally.
  local: [
    'chromium', // keep browsers on separate lines
    'firefox', // to make it easier to comment out
    'webkit', // individual browsers
  ],

  // Browsers to test during automated continuous integration.
  //
  // https://saucelabs.com/platform/supported-browsers-devices
  // https://wiki.saucelabs.com/display/DOCS/Platform+Configurator
  //
  // Many browser configurations don't yet work with @web/test-runner-saucelabs.
  // See https://github.com/modernweb-dev/web/issues/472.
  sauce: [
    'sauce:Windows 10/Firefox@78', // Current ESR. See: https://wiki.mozilla.org/Release_Management/Calendar
    'sauce:Windows 10/Chrome@latest-3',
    'sauce:macOS 10.15/Safari@latest',
    'sauce:Windows 10/MicrosoftEdge@15',
  ],
  'sauce-ie11': ['sauce:Windows 7/Internet Explorer@11'],
};

let sauceLauncher;

function makeSauceLauncherOnce() {
  if (!sauceLauncher) {
    const user = (process.env.SAUCE_USERNAME || '').trim();
    const key = (process.env.SAUCE_ACCESS_KEY || '').trim();
    if (!user || !key) {
      throw new Error(
        'To test on Sauce, set the SAUCE_USERNAME' +
          ' and SAUCE_ACCESS_KEY environment variables.'
      );
    }
    sauceLauncher = createSauceLabsLauncher({
      user,
      key,
    });
  }
  return sauceLauncher;
}

/**
 * Recognized formats:
 *
 *   - "browser"
 *     Local playwright
 *     E.g. "chromium", "firefox"
 *
 *   - "sauce:os/browser@version"
 *     Sauce Labs
 *     E.g. "sauce:macOS 10.15/safari@latest"
 *
 *   - "preset:name"
 *     Expand one of the preset sets of browsers
 *     E.g. "preset:local", "preset:sauce"
 */
function parseBrowser(browser) {
  browser = browser.trim();
  if (!browser) {
    return [];
  }

  if (browser.startsWith('preset:')) {
    const preset = browser.substring('preset:'.length);
    const entries = browserPresets[preset];
    if (!entries) {
      throw new Error(
        `Unknown preset "${preset}", please pick one of: ` +
          Object.keys(browserPresets).join(', ')
      );
    }
    return entries.map(parseBrowser).flat();
  }

  if (browser.startsWith('sauce:')) {
    // Note this is the syntax used by WCT. Might as well use the same one.
    const match = browser.match(/^sauce:(.+)\/(.+)@(.+)$/);
    if (!match) {
      throw new Error(`

Invalid Sauce browser string.
Expected format "sauce:os/browser@version".
Provided string was "${browser}".

Valid examples:

  sauce:macOS 10.15/safari@13
  sauce:Windows 10/MicrosoftEdge@18
  sauce:Windows 7/internet explorer@11
  sauce:Linux/chrome@latest-3
  sauce:Linux/firefox@78

See https://wiki.saucelabs.com/display/DOCS/Platform+Configurator for all options.`);
    }
    const [, platformName, browserName, browserVersion] = match;
    return [
      makeSauceLauncherOnce()({
        browserName,
        browserVersion,
        platformName,
        'sauce:options': {
          name: `lit tests [${mode}]`,
          build: `${process.env.GITHUB_REF ?? 'local'} build ${
            process.env.GITHUB_RUN_NUMBER ?? ''
          }`,
        },
      }),
    ];
  }

  return [
    playwrightLauncher({
      product: browser,
    }),
  ];
}

const browsers = (process.env.BROWSERS || 'preset:local')
  .split(',')
  .map(parseBrowser)
  .flat();

const require = createRequire(import.meta.url);

// https://modern-web.dev/docs/test-runner/cli-and-configuration/
export default {
  rootDir: '../',
  // Note this file list can be overridden by wtr command-line arguments.
  files: [
    '../lit-html/development/**/*_test.(js|html)',
    '../lit-element/development/**/*_test.(js|html)',
    '../reactive-element/development/**/*_test.(js|html)',
  ],
  nodeResolve: true,
  concurrency: Number(process.env.CONCURRENT_FRAMES || 6), // default cores / 2
  concurrentBrowsers: Number(process.env.CONCURRENT_BROWSERS || 2), // default 2
  browsers,
  plugins: [
    fromRollup(resolveRemap)(resolveRemapConfig),
    // Detect browsers without modules (e.g. IE11) and transform to SystemJS
    // (https://modern-web.dev/docs/dev-server/plugins/legacy/).
    legacyPlugin({
      polyfills: {
        // Rather than use the webcomponents polyfill version bundled with the
        // legacyPlugin, we inject a custom version of the polyfill; this both
        // gives us more control over the version, but also allows a mechanism
        // for tests to opt out of automatic injection, so that they can control
        // the timing when the polyfill loads (i.e. for setting polyfill flags
        // in an inline script before polyfills are manually loaded). Note that
        // .html-based tests can add a `<meta name="manual-polyfills">` tag in
        // the head to opt out of automatic polyfill injection and load them
        // manually using a `<script>` tag in the page.
        webcomponents: false,
        custom: [
          {
            name: 'webcomponents-2.5.0',
            path: require.resolve(
              '@webcomponents/webcomponentsjs/webcomponents-bundle.js'
            ),
            // Don't load if the page is tagged with a special meta indicating
            // the polyfills will be loaded manually
            test: '!document.querySelector("meta[name=manual-polyfills]")',
            module: false,
          },
        ],
      },
    }),
  ],
  // Only actually log errors and warnings. This helps make test output less spammy.
  filterBrowserLogs: (type) => type === 'warn' || type === 'error',
  browserStartTimeout: 60000, // default 30000
  testsStartTimeout: 60000, // default 10000
  testsFinishTimeout: 120000, // default 20000
  testFramework: {
    // https://mochajs.org/api/mocha
    config: {
      ui: 'tdd',
      timeout: '60000', // default 2000
    },
  },
};
