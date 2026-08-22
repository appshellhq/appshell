/* eslint-disable no-underscore-dangle */
import type { AppshellComposition, AppshellGlobalConfig } from '@appshell/config';
import loadAppshellComponent from './loadAppshellComponent';
import {
  chainResolvers,
  inlineResolver,
  legacyManifestResolver,
  registryResolver,
  type RemoteResolver,
} from './resolvers';

declare global {
  interface Window {
    [key: string]: unknown;
    __appshell_config__?: AppshellComposition;
  }
}

export type RemoteLoaderOptions = {
  composition?: AppshellComposition;
  /** Replaces the resolver chain outright; a seam for tests and embedders. */
  resolver?: RemoteResolver;
};

export default (config: AppshellGlobalConfig, options: RemoteLoaderOptions = {}) => {
  const composition =
    options.composition ?? (typeof window === 'undefined' ? undefined : window.__appshell_config__);

  const resolve =
    options.resolver ??
    chainResolvers(
      inlineResolver(composition),
      registryResolver(composition),
      legacyManifestResolver(config),
    );

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

    const { remote, environment, manifest } = resolution;

    try {
      window[`__appshell_env__${remote.scope}`] = environment;

      const Component = await loadAppshellComponent<TComponent>(
        remote.scope,
        remote.module,
        remote.remoteEntryUrl,
        remote.shareScope,
      );

      return [Component, manifest] as const;
    } catch (err) {
      throw failed(err);
    }
  };
};
