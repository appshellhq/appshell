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
  const detail =
    `${response.status} ${Array.isArray(message) ? message.join(', ') : message ?? ''}`.trim();

  return response.status === 401 ? `${detail} Run \`appshell login\` or set APPSHELL_TOKEN.` : detail;
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
