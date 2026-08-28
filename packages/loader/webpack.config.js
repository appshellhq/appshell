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
      // `self` is the UMD default and is absent under Node, which would break server
      // rendering and any node-environment test that loads the built package.
      globalObject: 'this',
    },
    resolve: {
      extensions: ['.js', '.ts'],
      plugins: [new TsconfigPathsPlugin()],
    },
    // Externalised, not bundled: `@appshell/runtime` is a shared singleton, and a copy
    // inlined here would be a second store that no package ever reads from.
    externals: {
      '@appshell/runtime': '@appshell/runtime',
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
