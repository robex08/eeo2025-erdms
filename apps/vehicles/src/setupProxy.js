const { createProxyMiddleware } = require('http-proxy-middleware');

/**
 * Proxy pro development server (npm start)
 * 
 * Přesměrovává API požadavky /dev/api.vehicles/* na Apache (port 80),
 * kde je vehicles PHP API servírováno přes php-fpm.
 */
module.exports = function (app) {
    app.use(
        '/dev/api.vehicles',
        createProxyMiddleware({
            target: 'http://localhost:80',
            changeOrigin: true,
            headers: {
                Host: 'erdms.zachranka.cz',
            },
        })
    );
};
