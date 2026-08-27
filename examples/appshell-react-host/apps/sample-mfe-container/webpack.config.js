const { ModuleFederationPlugin } = require('@module-federation/enhanced/webpack');
const path = require('path');
const { AppshellPlugin } = require('@appshell/webpack-plugin');
const ReactRefreshSingleton = require('single-react-refresh-plugin');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const { dependencies } = require('../../package.json');

module.exports = (env, { mode }) => {
  const isDevelopment = mode === 'development';

  return {
    entry: './src/Container',
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
      port: process.env.SAMPLE_MFE_CONTAINER_PORT,
    },
    output: {
      publicPath: 'auto',
      uniqueName: `sample-mfe-container`,
    },
    resolve: {
      extensions: ['.js', '.ts', '.tsx'],
      plugins: [new TsconfigPathsPlugin()],
    },
    // @appshell/react's dist bundles module-federation's own environment-detection
    // require(), which webpack cannot analyse statically. A known false positive.
    ignoreWarnings: [{ module: /@appshell[\/]react[\/]dist[\/]main\.js/ }],
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
        {
          test: /\.svg$/,
          loader: 'url-loader',
          exclude: /node_modules/,
          options: {
            limit: 10000,
            name: 'static/media/[name].[hash:8].[ext]',
          },
        },
      ],
    },
    plugins: [
      new ModuleFederationPlugin({
        name: 'ContainerModule',
        // No consumer currently relies on generated remote types.
        dts: false,
        exposes: {
          './Container': './src/Container',
        },
        filename: process.env.REMOTE_ENTRY_PATH,
        shared: {
          // Required because this package declares vars: the store they arrive in.
          // AppshellPlugin fails the build without it.
          '@appshell/runtime': {
            singleton: true,
            requiredVersion: dependencies['@appshell/runtime'],
          },
          react: {
            singleton: true,
            requiredVersion: dependencies['react'],
          },
          'react-dom': {
            singleton: true,
            requiredVersion: dependencies['react-dom'],
          },
          'react-refresh': {
            singleton: true,
            requiredVersion: dependencies['react-refresh'],
          },
          '@appshell/react': {
            singleton: true,
            requiredVersion: dependencies['@appshell/react'],
          },
        },
      }),
      new AppshellPlugin(),
      // Its own error overlay (separate from devServer.client.overlay) catches any
      // uncaught window error, including unrelated ones from browser extensions.
      isDevelopment && new ReactRefreshWebpackPlugin({ overlay: false }),
      isDevelopment && new ReactRefreshSingleton(),
    ].filter(Boolean),
  };
};
