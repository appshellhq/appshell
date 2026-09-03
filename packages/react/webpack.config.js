const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const Visualizer = require('webpack-visualizer-plugin2');

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
                presets: [['@babel/preset-react', { runtime: 'automatic' }], '@babel/preset-typescript'],
              },
            },
          ],
        },
      ],
    },
    // plugins: [isDevelopment && new Visualizer()].filter(Boolean),
    // Externalised, not bundled: `@appshell/runtime` is a shared singleton, and a copy
    // inlined here would be a second store that no package ever reads from.
    externals: {
      '@appshell/runtime': '@appshell/runtime',
      react: 'react',
      // The automatic JSX runtime resolves these rather than reaching for `React`, so
      // they need externalising alongside it. Left bundled, this package ships its own
      // copy of the element factory while importing React from the host — the elements
      // still interoperate, but a package that externalises react and inlines half of it
      // is not saying what it means.
      'react/jsx-runtime': 'react/jsx-runtime',
      'react/jsx-dev-runtime': 'react/jsx-dev-runtime',
      'react-dom': 'reactDOM',
    },
  };
};
