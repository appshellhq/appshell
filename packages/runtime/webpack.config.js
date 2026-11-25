const path = require('path');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = (env, { mode }) => {
  const isDevelopment = mode === 'development';

  return {
    // `vars` is a second entry rather than part of `main` on purpose: it must stay out of
    // the shared module so each package gets its own compiled scope. See src/vars.ts.
    entry: { main: './src/index', vars: './src/vars' },
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
    // Self-external: `src/vars.ts` imports this package by name so the emitted
    // `require('@appshell/runtime')` survives as a request module federation can
    // intercept. Without this webpack would resolve it back to these same sources and
    // inline a second, unshared store.
    externals: {
      '@appshell/runtime': '@appshell/runtime',
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
