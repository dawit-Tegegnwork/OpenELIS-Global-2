const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  app.use(
    "/OpenELIS-Global",
    createProxyMiddleware({
      target: "https://localhost:8443",
      changeOrigin: true,
      secure: false,
    }),
  );
};
