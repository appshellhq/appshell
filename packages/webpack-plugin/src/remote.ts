import type { SharedObject } from '@appshell/config';
import type { Configuration, WebpackPluginInstance } from 'webpack';
import AppshellPlugin from './AppshellPlugin';
import { appshellShared } from './shared';

export type AppshellRemoteOptions = {
  /** The federation container's name, such as `PackagesModule`: the scope its manifest names. */
  name: string;
  /** What the remote exposes, as `ModuleFederationPlugin` takes it: `{ './Packages': './src/Packages' }`. */
  exposes: Record<string, string>;
  /** webpack's mode, as its CLI passes it to a config function: `(env, { mode }) => …`. */
  mode?: Configuration['mode'];
  /** The port its dev server listens on, for an overlay to point at. */
  port: number;
  /** The build's entry. Defaults to the first module it exposes. */
  entry?: string;
  /** Share React and appshell's React bindings, as `appshellShared` does. Off unless asked. */
  react?: boolean;
  /** Usually package.json's `dependencies`, which pin each shared package's range. */
  dependencies?: Record<string, string>;
  /**
   * Shared beyond appshell's preset: a container's own contract, such as the workspace's
   * `react-router` singleton for the remotes contributing to it. Merged last.
   */
  shared?: SharedObject;
  /** webpack's `output.uniqueName`, which keeps two remotes' chunks apart. Defaults to `name`. */
  uniqueName?: string;
  /**
   * The hosts allowed to open the dev server's reload socket. A remote is loaded into a shell on
   * the application's origin, so that host has to be here, or edits never arrive. `'all'` by
   * default: the dev server already answers every origin's requests (its CORS header, which an
   * overlay needs), so the check guards only the reload socket. Name the application's hosts to
   * narrow it, such as `['.appshell.org']`.
   */
  allowedHosts?: 'all' | string[];
  /** Passed to `AppshellPlugin`. */
  plugin?: ConstructorParameters<typeof AppshellPlugin>[0];
};

/** A webpack configuration with a dev server, which webpack's own type leaves to webpack-dev-server. */
export type AppshellRemoteConfiguration = Configuration & { devServer: Record<string, unknown> };

type FederationPlugin = new (options: Record<string, unknown>) => WebpackPluginInstance;

/**
 * Module Federation's webpack plugin, which only this factory needs: a peer dependency, loaded
 * when it's called, so a package using `AppshellPlugin` alone installs nothing more.
 */
const federationPlugin = (): FederationPlugin => {
  try {
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    return require('@module-federation/enhanced/webpack').ModuleFederationPlugin;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'MODULE_NOT_FOUND') throw error;

    throw new Error(
      'appshellRemote() builds a Module Federation remote, so it needs @module-federation/enhanced: ' +
        'npm install --save-dev @module-federation/enhanced',
    );
  }
};

/**
 * `@appshell/react`'s bundle carries Module Federation's runtime, whose loader imports a remote
 * entry from a URL known only at runtime. webpack can't follow that and warns in every build
 * that bundles it; the entries load through the federation runtime, never webpack's module
 * graph (appshellhq/appshell#72). Only that warning, from only that module.
 */
const FEDERATION_RUNTIME_WARNING = {
  module: /@appshell[\\/]react[\\/]dist[\\/]main\.js/,
  message: /Critical dependency: the request of a dependency is an expression/,
};

/**
 * The webpack configuration every appshell remote needs, for an author to extend with their own
 * loaders, `webpack-merge` being the usual way (appshellhq/appshell#74):
 *
 * ```js
 * const { merge } = require('webpack-merge');
 * const { appshellRemote } = require('@appshell/webpack-plugin');
 * const { dependencies } = require('./package.json');
 *
 * module.exports = (_env, { mode }) =>
 *   merge(
 *     appshellRemote({
 *       name: 'PackagesModule',
 *       exposes: { './Packages': './src/Packages' },
 *       port: 7302,
 *       mode,
 *       react: true,
 *       dependencies,
 *     }),
 *     { module: { rules: [ … ] }, resolve: { extensions: ['.js', '.ts', '.tsx'] } },
 *   );
 * ```
 *
 * Each setting is something an appshell application requires of a remote, and nothing else:
 * a transpiler, CSS and tests are the author's.
 *
 * - **Source maps without `eval`.** The registry serves the shell page under a CSP that forbids
 *   it, so development's default `eval` source maps throw before the remote runs.
 * - **`publicPath: 'auto'`.** The registry serves a remote's files under
 *   `/p/<scope>/<name>/<version>/` on whatever origin the application has, and an overlay serves
 *   them from a dev server: the path is known only once the remote entry loads.
 * - **Content-hashed chunks and an unhashed `remoteEntry.js`.** A chunk's name names its bytes,
 *   so nothing pairs a fresh entry with a stale chunk. The entry stays `remoteEntry.js`, the file
 *   the published manifest names and the registry builds the remote's URL from.
 * - **A dev server an overlay can use.** The page is on the application's origin and the code on
 *   `localhost`: a CORS header so the shell can read it, the hosts allowed to open its reload
 *   socket, and a socket URL a browser can dial (the server binds every interface, and bakes
 *   `0.0.0.0` into its client otherwise). Only errors cover the page; warnings stay in the
 *   terminal, and errors thrown by anything else on the page, a browser extension's say, aren't
 *   the remote's.
 * - **Module Federation with `appshellShared`.** `@appshell/react-shell` is the federation host,
 *   and shares appshell's runtime, and with `react`, React and its bindings, as singletons.
 * - **`AppshellPlugin`,** which writes the manifest a publish sends.
 */
export const appshellRemote = ({
  name,
  exposes,
  mode,
  port,
  entry = Object.values(exposes)[0],
  react = false,
  dependencies = {},
  shared = {},
  uniqueName = name,
  allowedHosts = 'all',
  plugin,
}: AppshellRemoteOptions): AppshellRemoteConfiguration => {
  const ModuleFederationPlugin = federationPlugin();

  return {
    entry,
    mode,
    devtool: mode === 'development' ? 'source-map' : false,
    devServer: {
      port,
      headers: { 'Access-Control-Allow-Origin': '*' },
      allowedHosts,
      client: {
        webSocketURL: `ws://localhost:${port}/ws`,
        overlay: { errors: true, warnings: false, runtimeErrors: false },
      },
    },
    output: {
      publicPath: 'auto',
      filename: '[name].[contenthash].js',
      chunkFilename: '[name].[contenthash].js',
      uniqueName,
    },
    ignoreWarnings: [FEDERATION_RUNTIME_WARNING],
    plugins: [
      new ModuleFederationPlugin({
        name,
        exposes,
        filename: 'remoteEntry.js',
        // No consumer relies on generated remote types, and generating them needs a TypeScript
        // setup the remote may not have.
        dts: false,
        shared: appshellShared({ react, dependencies, extra: shared }),
      }),
      new AppshellPlugin(plugin),
    ],
  };
};

export default appshellRemote;
