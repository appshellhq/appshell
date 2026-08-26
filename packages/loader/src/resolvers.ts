import type { AppshellComposition, ResolvedRemote } from '@appshell/config';

export type RemoteResolution = {
  remote: ResolvedRemote;
  /** Already merged with the application's overrides — nothing left for the browser to layer on. */
  vars: Record<string, string | number | undefined>;
};

export type RemoteResolver = (key: string) => Promise<RemoteResolution | undefined>;

/** The registry inlined the composition into the page, so no network call is needed. */
export const inlineResolver =
  (composition?: AppshellComposition): RemoteResolver =>
  async (key) => {
    const remote = composition?.remotes[key];
    if (!composition || !remote) return undefined;

    return {
      remote,
      vars: composition.vars[remote.scope] ?? {},
    };
  };

/** Fetch-on-miss: covers a package activated after this page was served. */
export const registryResolver =
  (composition?: AppshellComposition, origin = ''): RemoteResolver =>
  async (key) => {
    if (!composition) return undefined;

    const url = `${origin}/v1/applications/${composition.applicationId}/remotes/${key}`;
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) return undefined;

    const remote: ResolvedRemote = await response.json();

    return {
      remote,
      vars: composition.vars[remote.scope] ?? {},
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
