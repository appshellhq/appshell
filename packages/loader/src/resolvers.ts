import type {
  AppshellComposition,
  AppshellGlobalConfig,
  AppshellManifest,
  ResolvedRemote,
} from '@appshell/config';

export type RemoteResolution = {
  remote: ResolvedRemote;
  /** Already merged with the environment's overrides — nothing left for the browser to layer on. */
  environment: Record<string, string | number | undefined>;
  /** Back-compat payload for `ManifestProvider`; synthesized when the source was a composition. */
  manifest: AppshellManifest;
};

export type RemoteResolver = (key: string) => Promise<RemoteResolution | undefined>;

const manifestOf = (composition: AppshellComposition, remotes: AppshellManifest['remotes']) => ({
  remotes,
  environment: composition.environment,
  modules: {},
});

/** The registry inlined the composition into the page, so no network call is needed. */
export const inlineResolver =
  (composition?: AppshellComposition): RemoteResolver =>
  async (key) => {
    const remote = composition?.remotes[key];
    if (!composition || !remote) return undefined;

    return {
      remote,
      environment: composition.environment[remote.scope] ?? {},
      manifest: manifestOf(composition, composition.remotes),
    };
  };

/** Fetch-on-miss: covers an app activated after this page was served. */
export const registryResolver =
  (composition?: AppshellComposition, origin = ''): RemoteResolver =>
  async (key) => {
    if (!composition) return undefined;

    const url = `${origin}/v1/environments/${composition.environmentId}/remotes/${key}`;
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) return undefined;

    const remote: ResolvedRemote = await response.json();

    return {
      remote,
      environment: composition.environment[remote.scope] ?? {},
      manifest: manifestOf(composition, { [key]: remote }),
    };
  };

/**
 * Pre-registry hosts: follow `index[key]` to the app's own manifest. The override
 * merge stays here because in this mode no server has done it.
 */
export const legacyManifestResolver = (config: AppshellGlobalConfig): RemoteResolver => {
  const cache = new Map<string, Promise<AppshellManifest>>();

  const fetchManifest = (url: string) => {
    const cached = cache.get(url);
    if (cached) return cached;

    const pending = fetch(url, { credentials: 'include' }).then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to get manifest from ${url}. ${await response.text()}`);
      }
      return response.json() as Promise<AppshellManifest>;
    });

    cache.set(url, pending);

    return pending;
  };

  return async (key) => {
    const manifestUrl = config.index?.[key];
    if (!manifestUrl) return undefined;

    const manifest = await fetchManifest(manifestUrl);
    const remote = manifest?.remotes[key];
    if (!remote) return undefined;

    return {
      remote,
      environment: {
        ...(manifest.environment[remote.scope] ?? {}),
        ...(config.overrides?.environment?.[remote.scope] ?? {}),
      },
      manifest,
    };
  };
};

export const chainResolvers =
  (...resolvers: RemoteResolver[]): RemoteResolver =>
  async (key) => {
    // eslint-disable-next-line no-restricted-syntax
    for (const resolve of resolvers) {
      // eslint-disable-next-line no-await-in-loop
      const resolution = await resolve(key);
      if (resolution) return resolution;
    }

    return undefined;
  };
