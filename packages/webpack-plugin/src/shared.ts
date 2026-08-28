import type { SharedObject } from '@appshell/config';

/**
 * The store a package's vars are delivered into. One instance for the whole page, or each
 * package reads from an empty copy of its own.
 */
const RUNTIME = '@appshell/runtime';

/**
 * The React bindings. A singleton because `RemoteSlot` supplies the context that
 * `useRemote()` reads, and those two sit either side of a federation boundary — two copies
 * means the hook finds no provider.
 */
const REACT_BINDINGS = '@appshell/react';

const REACT = ['react', 'react-dom'];

export type AppshellSharedOptions = {
  /** Include the React bindings and React itself. */
  react?: boolean;
  /**
   * Usually your package.json `dependencies`. Anything named here is pinned to the range
   * you depend on; anything absent is left for module federation to infer, which it does
   * from the installed package.
   */
  dependencies?: Record<string, string>;
  /** Merged last, so a package can still say something the preset does not. */
  extra?: SharedObject;
};

/**
 * The `shared` block an Appshell package needs, so it is not written out by hand in every
 * webpack config and wrong in one of them.
 *
 * It exists because the alternative failed in practice: the examples in this repo declared
 * `@appshell/react` as a singleton in three configs and omitted it in a fourth, which is
 * silent until a root package calls `useRemote()` and gets `undefined`.
 *
 * `AppshellPlugin` cannot inject this itself — `ModuleFederationPlugin` reads its own
 * options during its `apply`, which webpack has already run by the time it reaches ours.
 * Spread into your own config, it sidesteps plugin ordering entirely:
 *
 * ```js
 * const { appshellShared } = require('@appshell/webpack-plugin');
 * const { dependencies } = require('./package.json');
 *
 * new ModuleFederationPlugin({
 *   shared: appshellShared({ react: true, dependencies }),
 * });
 * ```
 */
export const appshellShared = ({
  react = false,
  dependencies = {},
  extra = {},
}: AppshellSharedOptions = {}): SharedObject => {
  const singleton = (name: string) =>
    dependencies[name]
      ? { singleton: true, requiredVersion: dependencies[name] }
      : { singleton: true };

  const names = [RUNTIME, ...(react ? [REACT_BINDINGS, ...REACT] : [])];

  return {
    ...names.reduce<SharedObject>((acc, name) => ({ ...acc, [name]: singleton(name) }), {}),
    ...extra,
  };
};

export default appshellShared;
