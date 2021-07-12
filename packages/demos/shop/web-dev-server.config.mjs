import {legacyPlugin} from '@web/dev-server-legacy';

export default {
  nodeResolve: true,
  preserveSymlinks: true,
  appIndex: 'index.html',
  plugins: [
    legacyPlugin({
      polyfills: {
        webcomponents: true,
        fetch: true,
        custom: [
          {
            name: 'lit-polyfill-support',
            path: 'node_modules/lit/polyfill-support.js',
            test: "!('attachShadow' in Element.prototype)",
            module: false,
          },
        ],
      },
    }),
  ],
};
