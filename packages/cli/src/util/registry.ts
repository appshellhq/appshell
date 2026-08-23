/* eslint-disable no-console */
import { AxiosRequestConfig } from 'axios';
import axios from './axios';
import { resolveToken } from './credentials';

export type EnvironmentSummary = {
  id: string;
  scopeId: string;
  name: string;
  owner: string;
  visibility: 'public' | 'private';
  ephemeral: boolean;
  revision: number;
  apps: Record<string, { appId: string; activatedAt: string }>;
  createdAt: string;
  lastModifiedAt: string;
};

export type EnvironmentRevision = {
  revision: number;
  actor: string;
  reason: string;
  createdAt: string;
};

export type SharedDependencyRequest = {
  appId: string;
  requiredVersion?: string;
  singleton: boolean;
};

export type SharedDependencyUsage = {
  shareScope: string;
  packageName: string;
  baseline?: string;
  requests: SharedDependencyRequest[];
  conflict: boolean;
};

export type SharedDependencyReport = {
  enforcement: 'off' | 'warn' | 'block';
  conflicts: number;
  dependencies: SharedDependencyUsage[];
};

export type OverlayRemoteBody = {
  remoteEntryUrl: string;
  manifestUrl?: string;
};

export type CreateOverlayBody = {
  remotes: Record<string, OverlayRemoteBody>;
  shellFlavor?: 'prod' | 'dev';
};

export type CreatedOverlay = {
  id: string;
  /** Registry-relative; the browser, not the CLI, is what redeems it. */
  confirmUrl: string;
  url: string;
  remotes: string[];
  shellFlavor: 'prod' | 'dev';
  expiresAt: string;
};

export type OpenOverlay = {
  id: string;
  owner: string;
  remotes: string[];
  shellFlavor: 'prod' | 'dev';
  createdAt: string;
  expiresAt: string;
  confirmUrl: string;
};

export type CreateEnvironmentBody = {
  name: string;
  visibility?: 'public' | 'private';
  ephemeral?: boolean;
  shell?: Record<string, unknown>;
  overrides?: Record<string, unknown>;
};

export type SyncEnvironmentBody = {
  fromScopeId: string;
  fromName: string;
  mode?: 'replace' | 'merge';
  include?: Array<
    | 'apps'
    | 'shell'
    | 'overrides'
    | 'allowOverrides'
    | 'sharedBaselines'
    | 'sharedDepsEnforcement'
    | 'visibility'
  >;
};

export type CloneEnvironmentBody = {
  fromScopeId: string;
  fromName: string;
  visibility?: 'public' | 'private';
  ephemeral?: boolean;
};

const describe = (error: unknown) => {
  const { response } = error as { response?: { status: number; data?: { message?: unknown } } };
  if (!response) {
    return (error as Error).message;
  }

  const { message } = response.data ?? {};
  return `${response.status} ${Array.isArray(message) ? message.join(', ') : message ?? ''}`.trim();
};

export class RegistryClient {
  readonly baseUrl: string;

  constructor(registry: string) {
    this.baseUrl = registry.replace(/\/$/, '');
  }

  private request<T>(method: 'get' | 'post' | 'patch' | 'delete', route: string, body?: unknown) {
    const token = resolveToken(this.baseUrl);
    const config: AxiosRequestConfig = token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : {};

    console.debug(`${method.toUpperCase()} ${this.baseUrl}${route}`);

    return axios.request<T>({ ...config, method, url: `${this.baseUrl}${route}`, data: body });
  }

  private async send<T>(
    method: 'get' | 'post' | 'patch' | 'delete',
    route: string,
    action: string,
    body?: unknown,
  ): Promise<T> {
    try {
      const { data } = await this.request<T>(method, route, body);
      return data;
    } catch (error) {
      throw new Error(`Failed to ${action}: ${describe(error)}`);
    }
  }

  listEnvironments(scopeId?: string, owner?: string) {
    const query = new URLSearchParams();
    if (scopeId) query.set('scopeId', scopeId);
    if (owner) query.set('owner', owner);
    const suffix = query.toString() ? `?${query}` : '';

    return this.send<EnvironmentSummary[]>('get', `/v1/environments${suffix}`, 'list environments');
  }

  getEnvironment(scopeId: string, name: string) {
    return this.send<EnvironmentSummary>(
      'get',
      `/v1/environments/${scopeId}/${name}`,
      `fetch environment ${scopeId}/${name}`,
    );
  }

  createEnvironment(body: CreateEnvironmentBody) {
    return this.send<{ id: string }>(
      'post',
      '/v1/environments',
      `create environment ${body.name}`,
      body,
    );
  }

  deleteEnvironment(scopeId: string, name: string) {
    return this.send<{ id: string }>(
      'delete',
      `/v1/environments/${scopeId}/${name}`,
      `delete environment ${scopeId}/${name}`,
    );
  }

  composition(scopeId: string, name: string) {
    return this.send<Record<string, unknown>>(
      'get',
      `/v1/environments/${scopeId}/${name}/composition`,
      `fetch composition for ${scopeId}/${name}`,
    );
  }

  revisions(scopeId: string, name: string, limit?: number) {
    const suffix = limit ? `?limit=${limit}` : '';

    return this.send<EnvironmentRevision[]>(
      'get',
      `/v1/environments/${scopeId}/${name}/revisions${suffix}`,
      `list revisions for ${scopeId}/${name}`,
    );
  }

  rollback(scopeId: string, name: string, revision: number) {
    return this.send<{ id: string }>(
      'post',
      `/v1/environments/${scopeId}/${name}/rollback`,
      `roll ${scopeId}/${name} back to revision ${revision}`,
      { revision },
    );
  }

  syncEnvironment(scopeId: string, name: string, body: SyncEnvironmentBody) {
    return this.send<{ id: string }>(
      'post',
      `/v1/environments/${scopeId}/${name}/sync`,
      `sync environment ${scopeId}/${name}`,
      body,
    );
  }

  cloneEnvironment(scopeId: string, name: string, body: CloneEnvironmentBody) {
    return this.send<{ id: string }>(
      'post',
      `/v1/environments/${scopeId}/${name}/clone`,
      `clone environment ${scopeId}/${name}`,
      body,
    );
  }

  sharedDeps(scopeId: string, name: string) {
    return this.send<SharedDependencyReport>(
      'get',
      `/v1/environments/${scopeId}/${name}/shared-deps`,
      `fetch shared dependencies for ${scopeId}/${name}`,
    );
  }

  /** What the registry actually has published for an app, not what a local build says. */
  appManifest(scopeId: string, name: string) {
    return this.send<{ remotes: Record<string, { remoteEntryUrl: string; manifestUrl: string }> }>(
      'get',
      `/v1/apps/${scopeId}/${name}/manifest`,
      `fetch the published manifest for ${scopeId}/${name}`,
    );
  }

  listOverlays(scopeId: string, name: string) {
    return this.send<OpenOverlay[]>(
      'get',
      `/v1/environments/${scopeId}/${name}/overlays`,
      `list overlays on ${scopeId}/${name}`,
    );
  }

  createOverlay(scopeId: string, name: string, body: CreateOverlayBody) {
    return this.send<CreatedOverlay>(
      'post',
      `/v1/environments/${scopeId}/${name}/overlays`,
      `open an overlay on ${scopeId}/${name}`,
      body,
    );
  }

  stopRedirecting(scopeId: string, name: string, id: string, removeRemotes: string[]) {
    return this.send<{ id: string; remotes: string[] }>(
      'patch',
      `/v1/environments/${scopeId}/${name}/overlays/${id}`,
      `stop redirecting ${removeRemotes.join(', ')}`,
      { removeRemotes },
    );
  }

  closeOverlay(scopeId: string, name: string, id: string) {
    return this.send<{ id: string; revoked: boolean }>(
      'delete',
      `/v1/environments/${scopeId}/${name}/overlays/${id}`,
      `close overlay ${id}`,
    );
  }

  deactivate(scopeId: string, name: string, appScopeId: string, appName: string) {
    return this.send<{ id: string }>(
      'delete',
      `/v1/environments/${scopeId}/${name}/apps/${appScopeId}/${appName}`,
      `deactivate ${appScopeId}/${appName} in ${scopeId}/${name}`,
    );
  }

  unpublish(scopeId: string, name: string, version: string) {
    return this.send<{ id: string }>(
      'delete',
      `/v1/apps/${scopeId}/${name}/${version}`,
      `unpublish ${scopeId}/${name}@${version}`,
    );
  }
}

/** `scope/name`, defaulting the scope from config so `--environment dev` works. */
export const parseEnvironment = (environment: string, defaultScopeId: string) => {
  const parts = environment.split('/');
  if (parts.length === 1) {
    return { scopeId: defaultScopeId, name: parts[0] };
  }

  const [scopeId, name] = parts;
  if (parts.length !== 2 || !scopeId || !name) {
    throw new Error(`Invalid environment '${environment}'. Expected 'name' or 'scope/name'.`);
  }

  return { scopeId, name };
};
