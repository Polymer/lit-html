const litPlugin = require('../index.js');

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy('./_js');
  eleventyConfig.addPlugin(litPlugin, {
    componentModules: ['./_js/components.bundle.js'],
  });
};
