/**
 * Webpack Dev Server Proxy Configuration
 * 
 * Pro lokální vývoj (npm start) přesměruje požadavky na DEV server:
 * - http://localhost:3001/api.eeo/* -> http://localhost/dev/api.eeo/*
 * - http://localhost:3001/api/* -> http://localhost/api/*
 * - http://localhost:3001/prilohy/* -> http://localhost/prilohy/*
 */

const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy pro /api.eeo/ (EEO V2 API) -> DEV server /dev/api.eeo/
  app.use(
    '/api.eeo',
    createProxyMiddleware({
      target: 'http://localhost',
      pathRewrite: {
        '^/api.eeo': '/dev/api.eeo', // localhost:3001/api.eeo -> localhost/dev/api.eeo
      },
      changeOrigin: false, // Zachová Host: localhost
      headers: {
        'Host': 'erdms.zachranka.cz' // Přinutí Apache použít správný virtual host
      },
      secure: false,
      logLevel: 'debug',
      onProxyReq: (proxyReq, req, res) => {
        console.log(`[PROXY] ${req.method} ${req.path} -> http://localhost/dev/api.eeo${req.path.replace('/api.eeo', '')}`);
      },
      onError: (err, req, res) => {
        console.error(`[PROXY ERROR] ${req.method} ${req.path}:`, err.message);
      }
    })
  );

  // Proxy pro /api/ (Legacy API)
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost',
      changeOrigin: false,
      headers: {
        'Host': 'erdms.zachranka.cz'
      },
      secure: false,
      logLevel: 'debug'
    })
  );

  // Proxy pro přílohy
  app.use(
    '/prilohy',
    createProxyMiddleware({
      target: 'http://localhost',
      changeOrigin: false,
      headers: {
        'Host': 'erdms.zachranka.cz'
      },
      secure: false
    })
  );
};
