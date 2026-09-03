/* eslint-disable no-console */
import { AxiosRequestConfig } from 'axios';
import axios from './axios';
import { resolveToken } from './credentials';

export type ApplicationSummary = {
  id: string;
  scopeId: string;
  name: string;
  owner: string;
  ephemeral: boolean;
  revision: number;
  packages: Record<string, { packageId: string; activatedAt: string }>;
  createdAt: string;
  lastModifiedAt: string;
};

export type ApplicationRevision = {
  revision: number;
  actor: string;
  reason: string;
  createdAt: string;
};

export type SharedDependencyRequest = {
  packageId: string;
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

/** Either a published ref, or the base/accent pair naming one. The registry pins it. */
export type ThemeInputBody = {
  ref?: string;
  base?: string;
  accent?: string;
  colorScheme?: 'system' | 'light' | 'dark';
};

export type CreateOverlayBody = {
  remotes: Record<string, OverlayRemoteBody>;
  shellFlavor?: 'prod' | 'dev';
  /** Renders with a different theme for this browser only. Never touches the application. */
  theme?: ThemeInputBody;
};

export type CreatedOverlay = {
  id: string;
  /** Registry-relative; the browser, not the CLI, is what redeems it. */
  confirmUrl: string;
  url: string;
  remotes: string[];
  shellFlavor: 'prod' | 'dev';
  /**
   * The theme this overlay substitutes, pinned by the registry, when it substitutes one.
   *
   * Declared on both overlay responses because both report what the overlay does, and
   * having it on only one is how `dev start` came to omit the theme it had just applied.
   */
  theme?: string;
  expiresAt: string;
};

export type OpenOverlay = {
  id: string;
  owner: string;
  remotes: string[];
  shellFlavor: 'prod' | 'dev';
  /** The theme this overlay substitutes, when it substitutes one. */
  theme?: string;
  createdAt: string;
  expiresAt: string;
  confirmUrl: string;
};

/** Which overlay this is, as opposed to what it does. Nothing here changes the page. */
type OverlayIdentity = 'id' | 'owner' | 'createdAt' | 'expiresAt' | 'confirmUrl';

/** A field that changes what the developer sees, and so must be reported wherever an
 * overlay is described. */
export type OverlayEffect = Exclude<keyof OpenOverlay, OverlayIdentity>;

/**
 * The effects, enumerated so the surfaces that describe an overlay can be checked against
 * them rather than trusted to keep up.
 *
 * A theme was added to the overlay and three separate surfaces went on not mentioning it —
 * the badge, the registry's confirmation page, and `dev start`'s own output. Each omission
 * shipped. The failure is silent and always the same: the thing you asked for is the one
 * thing not reported, which reads as the feature not working.
 *
 * The registry keeps its own copy of this list against its own type, because the two
 * repos share no code. Each is checked against the shape it actually renders, so neither
 * can drift quietly.
 */
export const OVERLAY_EFFECTS = ['remotes', 'shellFlavor', 'theme'] as const;

/*
 * Adding a field to OpenOverlay now forces a decision: name it as an effect or as
 * identity. Leaving it unclassified fails to compile, before any test runs — which
 * matters because the tests are generated from this list, so a field missing from it is a
 * field nothing checks.
 */
type Unclassified = Exclude<OverlayEffect, (typeof OVERLAY_EFFECTS)[number]>;
type EveryEffectIsListed = Unclassified extends never ? true : 'unclassified overlay field';
export const OVERLAY_EFFECTS_ARE_EXHAUSTIVE: EveryEffectIsListed = true;

export type CreateApplicationBody = {
  name: string;
  ephemeral?: boolean;
  shell?: Record<string, unknown>;
  overrides?: Record<string, unknown>;
};

export type SyncApplicationBody = {
  fromScopeId: string;
  fromName: string;
  mode?: 'replace' | 'merge';
  include?: Array<
    | 'packages'
    | 'shell'
    | 'overrides'
    | 'allowOverrides'
    | 'sharedBaselines'
    | 'sharedDepsEnforcement'
  >;
};

export type CloneApplicationBody = {
  fromScopeId: string;
  fromName: string;
  ephemeral?: boolean;
};

/** Token values for one mode, keyed by role. The role list is versioned in @appshell/tokens. */
export type ThemeTokens = Record<string, string>;

/** A published theme: complete values for both modes, frozen at publish. */
export type Theme = {
  id: string;
  scopeId: string;
  name: string;
  version: string;
  owner: string;
  visibility: 'public' | 'private';
  digest: string;
  tokens: { light: ThemeTokens; dark: ThemeTokens };
  derivedFrom?: string;
  metadata?: Record<string, unknown>;
  publishedAt: string;
};

/** The file `appshell theme publish` sends. `init` writes one of these. */
export type ThemeResource = {
  apiVersion: string;
  kind: 'Theme';
  name: string;
  spec: {
    version: string;
    tokens: { light: ThemeTokens; dark: ThemeTokens };
    visibility?: 'public' | 'private';
    derivedFrom?: string;
    metadata?: Record<string, unknown>;
  };
};

/** The declarative resource `appshell app apply` sends to `/v1/apply`. */
export type ApplicationResource = {
  apiVersion: string;
  kind: 'Application';
  name: string;
  spec?: {
    shell?: Record<string, unknown>;
    /** The full desired set. Anything activated but absent here is deactivated. */
    packages?: string[];
    overrides?: Record<string, unknown>;
    allowOverrides?: boolean;
    allowOverlays?: boolean;
    sharedBaselines?: Record<string, unknown>;
    sharedDepsEnforcement?: 'off' | 'warn' | 'block';
    ephemeral?: boolean;
  };
};

export type ApplyResult = {
  id: string;
  created: boolean;
  changes: string[];
  message: string;
};

const describe = (error: unknown) => {
  const { response } = error as { response?: { status: number; data?: { message?: unknown } } };
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

  listThemes(scopeId?: string) {
    const suffix = scopeId ? `?scopeId=${encodeURIComponent(scopeId)}` : '';

    return this.send<Theme[]>('get', `/v1/themes${suffix}`, 'list themes');
  }

  /** Omit the version to resolve the highest published one. */
  getTheme(scopeId: string, name: string, version?: string) {
    const route = version
      ? `/v1/themes/${scopeId}/${name}/${version}`
      : `/v1/themes/${scopeId}/${name}`;

    return this.send<Theme>('get', route, `get theme ${scopeId}/${name}`);
  }

  publishTheme(body: {
    name: string;
    version: string;
    tokens: { light: ThemeTokens; dark: ThemeTokens };
    visibility?: 'public' | 'private';
    derivedFrom?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.send<{ id: string; created: boolean }>(
      'post',
      '/v1/themes',
      `publish theme ${body.name}@${body.version}`,
      body,
    );
  }

  listApplications(scopeId?: string, owner?: string) {
    const query = new URLSearchParams();
    if (scopeId) query.set('scopeId', scopeId);
    if (owner) query.set('owner', owner);
    const suffix = query.toString() ? `?${query}` : '';

    return this.send<ApplicationSummary[]>('get', `/v1/applications${suffix}`, 'list applications');
  }

  getApplication(scopeId: string, name: string) {
    return this.send<ApplicationSummary>(
      'get',
      `/v1/applications/${scopeId}/${name}`,
      `fetch application ${scopeId}/${name}`,
    );
  }

  createApplication(body: CreateApplicationBody) {
    return this.send<{ id: string }>(
      'post',
      '/v1/applications',
      `create application ${body.name}`,
      body,
    );
  }

  deleteApplication(scopeId: string, name: string) {
    return this.send<{ id: string }>(
      'delete',
      `/v1/applications/${scopeId}/${name}`,
      `delete application ${scopeId}/${name}`,
    );
  }

  /** Reconciles an application against a declared resource; creates it when absent. */
  apply(resource: ApplicationResource) {
    return this.send<ApplyResult>('post', '/v1/apply', `apply ${resource.name}`, resource);
  }

  composition(scopeId: string, name: string) {
    return this.send<Record<string, unknown>>(
      'get',
      `/v1/applications/${scopeId}/${name}/composition`,
      `fetch composition for ${scopeId}/${name}`,
    );
  }

  revisions(scopeId: string, name: string, limit?: number) {
    const suffix = limit ? `?limit=${limit}` : '';

    return this.send<ApplicationRevision[]>(
      'get',
      `/v1/applications/${scopeId}/${name}/revisions${suffix}`,
      `list revisions for ${scopeId}/${name}`,
    );
  }

  rollback(scopeId: string, name: string, revision: number) {
    return this.send<{ id: string }>(
      'post',
      `/v1/applications/${scopeId}/${name}/rollback`,
      `roll ${scopeId}/${name} back to revision ${revision}`,
      { revision },
    );
  }

  syncApplication(scopeId: string, name: string, body: SyncApplicationBody) {
    return this.send<{ id: string }>(
      'post',
      `/v1/applications/${scopeId}/${name}/sync`,
      `sync application ${scopeId}/${name}`,
      body,
    );
  }

  cloneApplication(scopeId: string, name: string, body: CloneApplicationBody) {
    return this.send<{ id: string }>(
      'post',
      `/v1/applications/${scopeId}/${name}/clone`,
      `clone application ${scopeId}/${name}`,
      body,
    );
  }

  sharedDeps(scopeId: string, name: string) {
    return this.send<SharedDependencyReport>(
      'get',
      `/v1/applications/${scopeId}/${name}/shared-deps`,
      `fetch shared dependencies for ${scopeId}/${name}`,
    );
  }

  /** What the registry actually has published for a package, not what a local build says. */
  packageManifest(scopeId: string, name: string) {
    return this.send<{ remotes: Record<string, { remoteEntryUrl: string; manifestUrl: string }> }>(
      'get',
      `/v1/packages/${scopeId}/${name}/manifest`,
      `fetch the published manifest for ${scopeId}/${name}`,
    );
  }

  listOverlays(scopeId: string, name: string) {
    return this.send<OpenOverlay[]>(
      'get',
      `/v1/applications/${scopeId}/${name}/overlays`,
      `list overlays on ${scopeId}/${name}`,
    );
  }

  createOverlay(scopeId: string, name: string, body: CreateOverlayBody) {
    return this.send<CreatedOverlay>(
      'post',
      `/v1/applications/${scopeId}/${name}/overlays`,
      `open an overlay on ${scopeId}/${name}`,
      body,
    );
  }

  stopRedirecting(scopeId: string, name: string, id: string, removeRemotes: string[]) {
    return this.send<{ id: string; remotes: string[] }>(
      'patch',
      `/v1/applications/${scopeId}/${name}/overlays/${id}`,
      `stop redirecting ${removeRemotes.join(', ')}`,
      { removeRemotes },
    );
  }

  closeOverlay(scopeId: string, name: string, id: string) {
    return this.send<{ id: string; revoked: boolean }>(
      'delete',
      `/v1/applications/${scopeId}/${name}/overlays/${id}`,
      `close overlay ${id}`,
    );
  }

  deactivate(scopeId: string, name: string, appScopeId: string, appName: string) {
    return this.send<{ id: string }>(
      'delete',
      `/v1/applications/${scopeId}/${name}/packages/${appScopeId}/${appName}`,
      `deactivate ${appScopeId}/${appName} in ${scopeId}/${name}`,
    );
  }

  unpublish(scopeId: string, name: string, version: string) {
    return this.send<{ id: string }>(
      'delete',
      `/v1/packages/${scopeId}/${name}/${version}`,
      `unpublish ${scopeId}/${name}@${version}`,
    );
  }
}

/** `scope/name`, defaulting the scope from config so `--application dev` works. */
export const parseApplication = (application: string, defaultScopeId: string) => {
  const parts = application.split('/');
  if (parts.length === 1) {
    return { scopeId: defaultScopeId, name: parts[0] };
  }

  const [scopeId, name] = parts;
  if (parts.length !== 2 || !scopeId || !name) {
    throw new Error(`Invalid application '${application}'. Expected 'name' or 'scope/name'.`);
  }

  return { scopeId, name };
};
