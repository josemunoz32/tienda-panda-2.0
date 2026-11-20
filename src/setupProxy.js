/**
 * Solo desarrollo (npm start): las APIs que en producción resuelve Firebase Hosting con funciones
 * (catálogo Ryuu/Steam y fotos livianas) se redirigen a la web publicada, para que el modo local
 * se comporte igual que la tienda real. No afecta al build de producción.
 */
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function setupProxy(app) {
  app.use(
    ['/api/ryuu', '/api/steam', '/img'],
    createProxyMiddleware({ target: 'https://pandastoregaming.cl', changeOrigin: true, secure: true }),
  );
};
