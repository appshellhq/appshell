const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const Visualizer = require('webpack-visualizer-plugin2');

module.exports = (env, { mode }) => {
  const isDevelopment = mode === 'development';

  return {
    entry: './src/index',
    mode,
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
    externals: {
      react: 'react',
      // The automatic JSX runtime resolves these rather than reaching for `React`, so
      // they need externalising alongside it — otherwise this library imports React from
      // the host while bundling its own copy of the element factory.
      'react/jsx-runtime': 'react/jsx-runtime',
      'react/jsx-dev-runtime': 'react/jsx-dev-runtime',
      'react-dom': 'reactDOM',
    },
  };
};
