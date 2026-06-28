const path = require('path');

module.exports = {
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  devServer: (devServerConfig) => {
    // Avoid webpack-dev-server schema error when allowedHosts is [] or contains empty strings (e.g. from env).
    devServerConfig.allowedHosts = 'all';
    return devServerConfig;
  },
};
