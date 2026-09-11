import axios from './axios';
import { AppshellManifest, Metadata, ModuleFederationLoader } from './types';

export type PublishOptions = {
  registry: string;
  token?: string;
  name: string;
  version: string;
  manifest: AppshellManifest;
  visibility?: 'public' | 'private';
  metadata?: Metadata;
  /** Ask the registry to overwrite an existing version whose content differs. */
  force?: boolean;
};

export type PublishResult = {
  /** `scope/name@version`. The scope comes from the token, not the caller. */
  id: string;
  created: boolean;
  /** Empty unless a shared block was sent. See `openOverlay`. */
  divergence: SharedDivergence[];
};

const authorization = (token?: string) =>
  token ? { Authorization: `Bearer ${token}` } : undefined;

const describe = (error: unknown) => {
  const { response } = error as {
    response?: { status: number; data?: { message?: unknown } };
  };

  if (!response) {
    return (error as Error).message;
  }

  const { message } = response.data ?? {};
  const detail = `${response.status} ${
    Array.isArray(message) ? message.join(', ') : message ?? ''
  }`.trim();

  return response.status === 401
    ? `${detail} Run \`appshell login\` or set APPSHELL_TOKEN.`
    : detail;
};

/**
 * Publishing the same content twice is a no-op; publishing different content
 * under a version that already exists is rejected by the registry, unless
 * `force` is set and the registry is configured to honor it (dev registries).
 */
export const publish = async ({
  registry,
  token,
  name,
  version,
  manifest,
  visibility,
  metadata,
  force,
}: PublishOptions): Promise<PublishResult> => {
  /*
   * An exposed entrypoint describes the artifact, so nothing on one may still be a
   * placeholder.
   *
   * Vars may legitimately arrive unresolved — a `${VAR}` under `vars` is a declaration and
   * the application supplies it. A remote is the opposite: every field on it is something
   * the build knows about itself, and there is no later layer that could fill one in.
   * Publishing one unresolved stores an immutable manifest nothing can load, and the
   * failure surfaces much later as a browser fetching a variable name.
   *
   * Checked here rather than when the manifest is built, so a build without a complete
   * environment still emits its assets. Only publishing is refused.
   */
  const unresolved = Object.entries(manifest?.components ?? {}).flatMap(([key, remote]) =>
    Object.entries(remote)
      .filter(([, value]) => typeof value === 'string' && /\$\{\w+}/.test(value))
      .map(([field, value]) => `${key}.${field} (${value})`),
  );

  if (unresolved.length) {
    throw new Error(
      `Cannot publish ${name}@${version}: these remote fields were never resolved — ` +
        `${unresolved.join(', ')}. Set the variables they name, or write a literal.`,
    );
  }

  try {
    const { data } = await axios.post<PublishResult>(
      `${registry.replace(/\/$/, '')}/v1/packages`,
      { name, version, manifest, visibility, metadata, force },
      { headers: authorization(token) },
    );

    return data;
  } catch (error) {
    throw new Error(`Failed to publish ${name}@${version}: ${describe(error)}`);
  }
};

/**
 * Activating a newer version of an already active package upgrades it in place.
 * @param application `scope/name`
 */
export const activate = async (
  registry: string,
  application: string,
  packageId: string,
  token?: string,
): Promise<void> => {
  const [scopeId, name] = application.split('/');

  if (!scopeId || !name) {
    throw new Error(`Invalid application '${application}'. Expected 'scope/name'.`);
  }

  try {
    await axios.post(
      `${registry.replace(/\/$/, '')}/v1/applications/${scopeId}/${name}/packages`,
      { packageId },
      { headers: authorization(token) },
    );
  } catch (error) {
    throw new Error(`Failed to activate ${packageId} in ${application}: ${describe(error)}`);
  }
};

/** What an overlay redirects a single remote to, or introduces one as. */
export type OverlayRemotePatch = {
  remoteEntryUrl: string;
  manifestUrl?: string;
  /**
   * How to load this build's copy, from the Module Federation config that emits it.
   *
   * Sent because the loader describes the code being loaded, and an overlay points at
   * this build rather than the published one. Without it a redirect addresses a dev
   * server's bundle by whatever container name the last publish happened to have, so
   * renaming the container locally resolves to a container the browser cannot find.
   *
   * It is also what lets an overlay introduce a component that is not published yet: a
   * redirect inherits the published loader, an addition has no published anything.
   */
  loader?: ModuleFederationLoader;
  /**
   * The remote's `metadata` as this build declares it.
   *
   * Sent because a developer iterating on `appshell.config.yaml` is editing metadata as
   * much as code; without it an overlay serves their new bundle beside the published
   * route, displayName and icon. The registry replaces rather than merges, so a key
   * removed from the yaml disappears rather than standing.
   */
  metadata?: Metadata;
};

/** One shared dependency where a local build and the published version disagree. */
export type SharedDivergence = {
  packageId: string;
  shareScope: string;
  packageName: string;
  published?: string;
  local?: string;
  singleton: { published: boolean; local: boolean };
};

export type OpenedOverlay = {
  id: string;
  confirmUrl: string;
  url: string;
  remotes: string[];
  expiresAt: string;
  /**
   * False when an overlay was already open for this developer and this one extended it.
   * A browser carries a single overlay id, so an extended overlay is one some browser has
   * already confirmed — nothing needs sending back to the confirmation page.
   */
  created: boolean;
  /**
   * What this build declares that the published version does not. Empty unless a shared
   * block was sent — see `openOverlay`.
   */
  divergence: SharedDivergence[];
};

/**
 * Points some of an application's remotes at a developer's own machine, for that
 * developer only.
 *
 * This is what a local dev loop does instead of republishing. A published version is
 * immutable and content-addressed; overwriting one on every rebuild makes the digest
 * describe whoever built last, and two developers sharing a registry overwrite each
 * other. An overlay is per-developer, per-browser and expiring, so neither happens.
 *
 * Extending is the normal case rather than the exception: the registry merges remotes
 * into whatever overlay this developer already holds, so serving two micro-frontends
 * locally redirects both without minting a second overlay or asking for confirmation
 * twice.
 *
 * @param application `scope/name`
 */
export const openOverlay = async (
  registry: string,
  application: string,
  remotes: Record<string, OverlayRemotePatch>,
  token?: string,
  shared?: Record<string, unknown>,
): Promise<OpenedOverlay> => {
  const [scopeId, name] = application.split('/');

  if (!scopeId || !name) {
    throw new Error(`Invalid application '${application}'. Expected 'scope/name'.`);
  }

  try {
    const { data } = await axios.post<OpenedOverlay>(
      `${registry.replace(/\/$/, '')}/v1/applications/${scopeId}/${name}/overlays`,
      { remotes, ...(shared ? { shared } : {}) },
      { headers: authorization(token) },
    );

    return data;
  } catch (error) {
    throw new Error(`Failed to open an overlay on ${application}: ${describe(error)}`);
  }
};
