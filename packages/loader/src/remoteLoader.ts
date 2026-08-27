/* eslint-disable no-underscore-dangle */
import type { AppshellComposition } from '@appshell/config';
import { setVars } from '@appshell/runtime';
import loadAppshellComponent from './loadAppshellComponent';
import { chainResolvers, inlineResolver, registryResolver, type RemoteResolver } from './resolvers';

declare global {
  interface Window {
    __appshell_config__?: AppshellComposition;
  }
}

export type RemoteLoaderOptions = {
  composition?: AppshellComposition;
  /** Replaces the resolver chain outright; a seam for tests and embedders. */
  resolver?: RemoteResolver;
};

export default (options: RemoteLoaderOptions = {}) => {
  const composition =
    options.composition ?? (typeof window === 'undefined' ? undefined : window.__appshell_config__);

  const resolve =
    options.resolver ??
    chainResolvers(inlineResolver(composition), registryResolver(composition));

  return async <TComponent>(key: string) => {
    const failed = (err: unknown) =>
      new Error(`Failed to load component '${key}'. ${err?.toString()}`);

    let resolution;
    try {
      resolution = await resolve(key);
    } catch (err) {
      throw failed(err);
    }

    if (!resolution) {
      throw new Error(`Remote resource not found in registry. Expected: ${key}`);
    }

    const { remote, vars } = resolution;

    try {
      // Before the remote loads, so a package that validates its vars while its modules
      // evaluate still finds them. `@appshell/runtime` is a shared singleton, so this is
      // the same store the package reads through `getVars()`.
      setVars(remote.scope, vars);

      const Component = await loadAppshellComponent<TComponent>(
        remote.scope,
        remote.module,
        remote.remoteEntryUrl,
        remote.shareScope,
      );

      return [Component, remote] as const;
    } catch (err) {
      throw failed(err);
    }
  };
};
