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
    // @appshell/react's dist bundles module-federation's own environment-detection require(),
    // which webpack can't statically analyze; it's a known false positive, not a real issue.
    ignoreWarnings: [{ module: /packages\/react\/dist\/main\.js/ }],
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
        shared: {
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
          'styled-components': {
            singleton: true,
            requiredVersion: dependencies['styled-components'],
          },
          '@appshell/react': {
            singleton: true,
            requiredVersion: dependencies['@appshell/react'],
          },
        },
      }),
      new AppshellPlugin(),
      isDevelopment && new ReactRefreshWebpackPlugin(),
      isDevelopment && new ReactRefreshSingleton(),
    ].filter(Boolean),
  };
};
