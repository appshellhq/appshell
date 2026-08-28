const { ModuleFederationPlugin } = require('@module-federation/enhanced/webpack');
const path = require('path');
const { AppshellPlugin, appshellShared } = require('@appshell/webpack-plugin');
const ReactRefreshSingleton = require('single-react-refresh-plugin');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const { dependencies } = require('../../package.json');

module.exports = (env, { mode }) => {
  const isDevelopment = mode === 'development';

  return {
    entry: './src/Ping',
    mode,
    // dev-mode eval() is blocked by the shell's CSP; production already defaults to no devtool
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
      static: {
        directory: path.join(__dirname, 'dist'),
        watch: {
          ignored: [/node_modules/, /dist/],
        },
      },
      port: process.env.SAMPLE_MFE_PING_PORT,
    },
    output: {
      publicPath: 'auto',
      uniqueName: `sample-mfe-ping`,
    },
    resolve: {
      extensions: ['.js', '.ts', '.tsx'],
      plugins: [new TsconfigPathsPlugin()],
    },
    // @appshell/react's dist bundles module-federation's own environment-detection
    // require(), which webpack cannot analyse statically. A known false positive.
    ignoreWarnings: [{ module: /(@appshell|packages)[\/]react[\/]dist[\/]main\.js/ }],
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
                plugins: [isDevelopment && require.resolve('react-refresh/babel')].filter(Boolean),
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
      new ModuleFederationPlugin({
        name: 'PingModule',
        // No consumer currently relies on generated remote types.
        dts: false,
        exposes: {
          './Ping': './src/Ping',
        },
        filename: process.env.REMOTE_ENTRY_PATH,
        // One preset rather than a hand-written list per package: the four configs here
        // previously disagreed about @appshell/react, which is silent until a package
        // calls useRemote() and finds no provider.
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
      new AppshellPlugin(),
      // Its own error overlay (separate from devServer.client.overlay) catches any
      // uncaught window error, including unrelated ones from browser extensions.
      isDevelopment && new ReactRefreshWebpackPlugin({ overlay: false }),
      isDevelopment && new ReactRefreshSingleton(),
    ].filter(Boolean),
  };
};
