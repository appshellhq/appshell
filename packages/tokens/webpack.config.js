const path = require('path');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = (env, { mode }) => {
  const isDevelopment = mode === 'development';

  return {
    entry: './src/index',
    mode,
    devtool: isDevelopment ? 'eval-source-map' : false,
    output: {
      filename: '[name].js',
      pathinfo: false,
      libraryTarget: 'umd',
      // The registry composes themes server-side, so this bundle has to load under node
      // as well as in a browser. Without it the UMD wrapper closes over `self`, which
      // only exists in the browser.
      globalObject: 'this',
    },
    resolve: {
      extensions: ['.js', '.ts'],
      plugins: [new TsconfigPathsPlugin()],
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: ['@babel/preset-typescript'],
              },
            },
          ],
        },
      ],
    },
  };
};
