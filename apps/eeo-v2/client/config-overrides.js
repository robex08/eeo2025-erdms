const webpack = require('webpack');

module.exports = function override(config, env) {
  // ⚡ PERFORMANCE OPTIMIZATIONS
  if (env === 'development') {
    // Enable webpack cache for faster rebuilds
    config.cache = {
      type: 'filesystem',
      cacheDirectory: require('path').resolve(__dirname, '.webpack-cache'),
      buildDependencies: {
        config: [__filename],
      },
    };

    // Optimize resolve - reduce lookup paths
    config.resolve.modules = ['node_modules'];
    config.resolve.symlinks = false;

    // Use faster source maps in dev
    config.devtool = 'eval-cheap-module-source-map';
  }

  // 🌐 DEV SERVER: Konfigurace pro remote development (SSH)
  if (env === 'development') {
    config.devServer = {
      ...config.devServer,
      host: '0.0.0.0', // Allow connections from any host
      port: 3000,
      allowedHosts: 'all', // Allow all hosts (no origin check)
      // WebSocket se řídí WDS_SOCKET_HOST z .env.development
      webSocketServer: 'ws',
      
      // 🚀 SSH TUNNEL OPTIMIZATIONS - Snížení datového toku
      // Polling namísto native file watching (šetří SSH bandwidth)
      watchOptions: {
        poll: 5000, // Kontrola změn každých 5s (místo real-time)
        aggregateTimeout: 1000, // Počkat 1s před rebuildem
        ignored: [
          '**/node_modules/**',
          '**/vendor/**',
          '**/.git/**',
          '**/build/**',
          '**/dist/**',
          '**/.webpack-cache/**',
          '**/coverage/**',
          '**/*.test.js',
          '**/*.spec.js'
        ],
      },
      
      // Omezit client logging (méně WebSocket zpráv)
      client: {
        logging: 'error', // Pouze chyby, ne každý hot update
        progress: false, // Vypnout progress bar updates
        overlay: {
          errors: true,
          warnings: false, // Skrýt warnings overlay
        },
      },
      
      // Vypnout liveReload jako fallback (používá více dat)
      liveReload: false,
      hot: true, // Pouze HMR
    };
  }

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
