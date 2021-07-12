import {legacyPlugin} from '@web/dev-server-legacy';
import {playwrightLauncher} from '@web/test-runner-playwright';

// Uncomment for testing on Sauce Labs
// Must run `npm i --save-dev @web/test-runner-saucelabs` and set
// SAUCE_USERNAME and SAUCE_USERNAME environment variables
// ===========
// import {createSauceLabsLauncher} from '@web/test-runner-saucelabs';
// const sauceLabsLauncher = createSauceLabsLauncher(
//   {
//     user: process.env.SAUCE_USERNAME,
//     key: process.env.SAUCE_USERNAME,
//   },
//   {
//     'sauce:options': {
//       name: 'unit tests',
//       build: `${process.env.GITHUB_REF ?? 'local'} build ${
//         process.env.GITHUB_RUN_NUMBER ?? ''
//       }`,
//     },
//   }
// );

// Uncomment for testing on BrowserStack
// Must run `npm i --save-dev @web/test-runner-browserstack` and set
// BROWSER_STACK_USERNAME and BROWSER_STACK_ACCESS_KEY environment variables
// ===========
// import {browserstackLauncher as createBrowserstackLauncher} from '@web/test-runner-browserstack';
// const browserstackLauncher = (config) => createBrowserstackLauncher({
//   capabilities: {
//     'browserstack.user': process.env.BROWSER_STACK_USERNAME,
//     'browserstack.key': process.env.BROWSER_STACK_ACCESS_KEY,
//     project: 'my-element',
//     name: 'unit tests',
//     build: `${process.env.GITHUB_REF ?? 'local'} build ${
//       process.env.GITHUB_RUN_NUMBER ?? ''
//     }`,
//     ...config,
//   }
// });

const browsers = {
  // Local browser testing via playwright
  // ===========
  chromium: playwrightLauncher({product: 'chromium'}),
  firefox: playwrightLauncher({product: 'firefox'}),
  webkit: playwrightLauncher({product: 'webkit'}),

  // Uncomment example launchers for running on Sauce Labs
  // ===========
  // chromium: sauceLabsLauncher({browserName: 'chrome', browserVersion: 'latest', platformName: 'Windows 10'}),
  // firefox: sauceLabsLauncher({browserName: 'firefox', browserVersion: 'latest', platformName: 'Windows 10'}),
  // edge: sauceLabsLauncher({browserName: 'MicrosoftEdge', browserVersion: 'latest', platformName: 'Windows 10'}),
  // ie11: sauceLabsLauncher({browserName: 'internet explorer', browserVersion: '11.0', platformName: 'Windows 10'}),
  // safari: sauceLabsLauncher({browserName: 'safari', browserVersion: 'latest', platformName: 'macOS 10.15'}),

  // Uncomment example launchers for running on Sauce Labs
  // ===========
  // chromium: browserstackLauncher({browserName: 'Chrome', os: 'Windows', os_version: '10'}),
  // firefox: browserstackLauncher({browserName: 'Firefox', os: 'Windows', os_version: '10'}),
  // edge: browserstackLauncher({browserName: 'MicrosoftEdge', os: 'Windows', os_version: '10'}),
  // ie11: browserstackLauncher({browserName: 'IE', browser_version: '11.0', os: 'Windows', os_version: '10'}),
  // safari: browserstackLauncher({browserName: 'Safari', browser_version: '14.0', os: 'OS X', os_version: 'Big Sur'}),
};

// Prepend BROWSERS=x,y to `npm run test` to run a subset of browsers
// e.g. `BROWSERS=chromium,firefox npm run test`
const noBrowser = (b) => {
  throw new Error(`No browser configured named '${b}'; using defaults`);
};
let commandLineBrowsers;
try {
  commandLineBrowsers = process.env.BROWSERS?.split(',').map(
    (b) => browsers[b] ?? noBrowser(b)
  );
} catch (e) {
  console.warn(e);
}

// https://modern-web.dev/docs/test-runner/cli-and-configuration/
export default {
  rootDir: '.',
  files: ['./test/**/*_test.js'],
  nodeResolve: true,
  preserveSymlinks: true,
  browsers: commandLineBrowsers ?? Object.values(browsers),
  testFramework: {
    // https://mochajs.org/api/mocha
    config: {
      ui: 'tdd',
    },
  },
  plugins: [
    // Detect browsers without modules (e.g. IE11) and transform to SystemJS
    // (https://modern-web.dev/docs/dev-server/plugins/legacy/).
    legacyPlugin({
      polyfills: {
        webcomponents: true,
        fetch: true,
        // Inject lit's polyfill-support module into test files, which is required
        // for interfacing with the webcomponents polyfills
        custom: [
          {
            name: 'lit-polyfill-support',
            path: 'node_modules/lit/polyfill-support.js',
            test:
              "!('attachShadow' in Element.prototype) || !('getRootNode' in Element.prototype) || window.ShadyDOM && window.ShadyDOM.force",
            module: false,
          },
        ],
      },
    }),
  ],
};