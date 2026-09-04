import axios from './axios';
import { AppshellManifest, Metadata } from './types';

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
   * A deployment coordinate that never resolved cannot be published.
   *
   * Vars may legitimately arrive unresolved — a `${VAR}` under `vars` is a declaration, and
   * the application supplies it. A remote url is the opposite: nobody downstream can supply
   * it, because only the build knows where its own artifact is served. Publishing one
   * unresolved stores an immutable manifest that nothing can ever load, and the failure
   * surfaces much later as a browser fetching a URL with a variable name in the path.
   *
   * Checked here rather than when the manifest is built, so a build without a complete
   * environment still emits its assets. Only publishing is refused.
   */
  const unresolved = Object.entries(manifest?.remotes ?? {}).flatMap(([key, remote]) =>
    Object.entries(remote)
      .filter(([, value]) => typeof value === 'string' && /\$\{\w+}/.test(value))
      .map(([field, value]) => `${key}.${field} (${value})`),
  );

  if (unresolved.length) {
    throw new Error(
      `Cannot publish ${name}@${version}: these deployment coordinates were never ` +
        `resolved — ${unresolved.join(', ')}. Set the variables they name, or write a literal.`,
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
