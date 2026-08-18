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

  return `${response.status} ${Array.isArray(message) ? message.join(', ') : message ?? ''}`.trim();
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
      `${registry.replace(/\/$/, '')}/v1/apps`,
      { name, version, manifest, visibility, metadata, force },
      { headers: authorization(token) },
    );

    return data;
  } catch (error) {
    throw new Error(`Failed to publish ${name}@${version}: ${describe(error)}`);
  }
};

/**
 * Activating a newer version of an already active app upgrades it in place.
 * @param environment `scope/name`
 */
export const activate = async (
  registry: string,
  environment: string,
  appId: string,
  token?: string,
): Promise<void> => {
  const [scopeId, name] = environment.split('/');

  if (!scopeId || !name) {
    throw new Error(`Invalid environment '${environment}'. Expected 'scope/name'.`);
  }

  try {
    await axios.post(
      `${registry.replace(/\/$/, '')}/v1/environments/${scopeId}/${name}/apps`,
      { appId },
      { headers: authorization(token) },
    );
  } catch (error) {
    throw new Error(`Failed to activate ${appId} in ${environment}: ${describe(error)}`);
  }
};
