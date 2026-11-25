const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const { appshellRemote } = require('@appshell/webpack-plugin');
const ReactRefreshSingleton = require('single-react-refresh-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const { merge } = require('webpack-merge');
const { dependencies } = require('../../package.json');

/*
 * What an appshell application requires of a remote comes from appshellRemote() (the plugin's
 * README has each setting and its reason). What's below is this example's own: Babel with React
 * Refresh, CSS through PostCSS, and the repository's TypeScript paths.
 */
module.exports = (env, { mode }) => {
  const isDevelopment = mode === 'development';

  return merge(
    appshellRemote({
      name: 'PongModule',
      exposes: { './Pong': './src/Pong', './CoolComponent': './src/CoolRemoteComponent' },
      port: Number(process.env.SAMPLE_MFE_PONG_PORT),
      mode,
      react: true,
      dependencies,
      uniqueName: 'sample-mfe-pong',
      // React Refresh's runtime, one instance for the page, as the shell's React is.
      shared: {
        'react-refresh': { singleton: true, requiredVersion: dependencies['react-refresh'] },
      },
    }),
    {
      devServer: { hot: true },
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
                  presets: [
                    ['@babel/preset-react', { runtime: 'automatic' }],
                    '@babel/preset-typescript',
                  ],
                  plugins: [isDevelopment && require.resolve('react-refresh/babel')].filter(
                    Boolean,
                  ),
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
        // Its own error overlay (separate from devServer.client.overlay) catches any uncaught
        // window error, including unrelated ones from browser extensions.
        isDevelopment && new ReactRefreshWebpackPlugin({ overlay: false }),
        isDevelopment && new ReactRefreshSingleton(),
      ].filter(Boolean),
    },
  );
};
