const { createProxyMiddleware } = require('http-proxy-middleware');

/**
 * Proxy pro development server (npm start)
 * 
 * Přesměrovává API požadavky /dev/api.inventik/* na Apache (port 80),
 * kde je Inventík PHP API servírováno přes php-fpm.
 */
module.exports = function (app) {
    app.use(
        '/dev/api.inventik',
        createProxyMiddleware({
            target: 'http://localhost:80',
            changeOrigin: true,
            headers: {
                Host: 'erdms.zachranka.cz',
            },
        })
    );
};
