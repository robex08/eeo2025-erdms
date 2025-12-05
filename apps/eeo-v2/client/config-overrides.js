const webpack = require('webpack');

module.exports = function override(config, env) {
  // Ignore source-map-loader warnings for node_modules
  config.ignoreWarnings = [
    {
      module: /node_modules/,
      message: /Failed to parse source map/,
    },
    {
      module: /node_modules/,
      message: /ENOENT: no such file or directory/,
    },
  ];

  // Optionally exclude source-map-loader from node_modules entirely
  config.module.rules = config.module.rules.map(rule => {
    if (rule.oneOf) {
      rule.oneOf = rule.oneOf.map(oneOfRule => {
        if (oneOfRule.loader && oneOfRule.loader.includes('source-map-loader')) {
          oneOfRule.exclude = /node_modules/;
        }
        return oneOfRule;
      });
    }
    return rule;
  });

  // 🔧 Polyfill Buffer pro @react-pdf/renderer (oprava "Buffer is not defined")
  config.resolve = config.resolve || {};
  config.resolve.fallback = {
    ...config.resolve.fallback,
    buffer: require.resolve('buffer/'),
  };

  config.plugins = [
    ...config.plugins,
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    }),
  ];

  return config;
};
