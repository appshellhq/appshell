const path = require('path');
const webpack = require('webpack');
const { ModuleFederationPlugin } = require('@module-federation/enhanced/webpack');
const CopyPlugin = require('copy-webpack-plugin');
const ReactRefreshSingleton = require('single-react-refresh-plugin');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const { appshellShared } = require('@appshell/webpack-plugin');
const { dependencies } = require('../../package.json');

module.exports = (env, { mode }) => {
  const isDevelopment = mode === 'development';
  /**
   * The dev-flavored bundle ships development React and the Fast Refresh runtime,
   * but the registry serves it as a static artifact. It is therefore not the same
   * thing as running under webpack-dev-server: nothing hot-updates the shell
   * itself, so it carries no HMR client of its own. The remotes are what get
   * edited, and each one already ships its own client inside its remoteEntry.
   */
  const isDevBundle = env?.flavor === 'dev';
  const isDevServer = isDevelopment && !isDevBundle;

  const browser = {
    entry: './src/index',
    mode,
    // dev-mode eval() is blocked by the shell's own CSP; production already defaults to no devtool
    devtool: isDevelopment ? 'source-map' : false,
    devServer: {
      hot: true,
      allowedHosts: 'all',
      // Browser extensions (e.g. MetaMask's injected inpage.js) throw unrelated runtime
      // errors on the page; only surface our own compile errors/warnings, not those.
      client: {
        overlay: {
          errors: true,
          warnings: true,
          runtimeErrors: false,
        },
      },
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': '*',
        'Access-Control-Allow-Headers': '*',
      },
      compress: true,
      // Only the bundle is served; the registry renders the shell that loads it.
      static: false,
      port: process.env.APPSHELL_PORT,
    },
    output: {
      ...(isDevBundle ? { path: path.resolve(__dirname, 'dist', 'dev') } : {}),
      publicPath: 'auto',
      uniqueName: `appshell-react-shell`,
    },
    resolve: {
      extensions: ['.js', '.ts', '.tsx'],
      plugins: [new TsconfigPathsPlugin()],
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: ['@babel/preset-react', '@babel/preset-typescript'],
                // Only under the dev server. The babel plugin emits `$RefreshReg$`/
                // `$RefreshSig$` calls that ReactRefreshWebpackPlugin defines, and the
                // dev bundle deliberately omits that plugin: nothing hot-updates the
                // shell itself, so its own modules need no refresh boundaries.
                plugins: [isDevServer && require.resolve('react-refresh/babel')].filter(Boolean),
              },
            },
          ],
        },
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader', 'postcss-loader'],
        },
      ],
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          { from: 'public/favicon.ico', to: '.' },
          { from: 'public/manifest.json', to: '.' },
          { from: 'public/logo192.png', to: '.' },
          { from: 'public/logo512.png', to: '.' },
        ],
      }),
      new ModuleFederationPlugin({
        name: 'Appshell',
        // The shell shares the same set every package does — it delivers vars into that
        // store and renders the root RemoteSlot, so a second copy of either breaks the
        // page in a way nothing reports. react-refresh is the shell's own addition.
        shared: appshellShared({
          react: true,
          dependencies,
          extra: {
            'react-refresh': {
              singleton: true,
              requiredVersion: dependencies['react-refresh'],
            },
          },
        }),
      }),
      isDevServer && new webpack.HotModuleReplacementPlugin(),
      // Its own error overlay (separate from devServer.client.overlay) catches any
      // uncaught window error, including unrelated ones from browser extensions.
      isDevServer && new ReactRefreshWebpackPlugin({ overlay: false }),
      // Aliases `react-refresh/runtime` onto one global instance. The dev bundle
      // needs it too: the shell installs the runtime first, so every remote that
      // loads later reuses the shell's rather than minting a second one.
      isDevelopment && new ReactRefreshSingleton(),
    ].filter(Boolean),
  };

  return browser;
};
