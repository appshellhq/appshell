import { ensureToken } from './credentials';
import axios from './axios';
import { describe } from './registry';

export type Member = { userId: string; role: 'owner' | 'admin' | 'member'; addedAt: string };

export type Organization = {
  id: string;
  slug: string;
  displayName: string;
  members: Member[];
  createdAt: string;
};

/**
 * The platform api a registry's organizations live on.
 *
 * Explicit first (`--api`, APPSHELL_API, `api` in config). Otherwise derived from the auth
 * issuer, because the platform names its hosts after the identity domain: auth.appshell.org
 * issues the tokens, api.appshell.org serves the platform's api, and the same holds locally
 * (auth.local.appshell.org → api.local.appshell.org). Nothing is guessed from the registry's
 * own host, which a self-hosted registry names freely.
 */
export const platformApi = (explicit?: string, authIssuer?: string): string | undefined => {
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }

  if (!authIssuer) {
    return undefined;
  }

  try {
    const { protocol, hostname } = new URL(authIssuer);

    return hostname.startsWith('auth.')
      ? `${protocol}//api.${hostname.slice('auth.'.length)}`
      : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Organizations, on the platform's organization service (navaris/platform-services
 * services/organization), reached through the platform api's gateway at /api/organizations.
 *
 * Authenticated with the same token as the registry: both are the identity domain's, and the
 * credential is stored per registry, which is the address a developer logged in against.
 */
export class OrganizationsClient {
  private readonly base: string;

  constructor(
    api: string,
    private readonly registry: string,
  ) {
    this.base = `${api.replace(/\/$/, '')}/api/organizations`;
  }

  private async send<T>(
    method: 'get' | 'post',
    route: string,
    action: string,
    body?: unknown,
  ): Promise<T> {
    const token = await ensureToken(this.registry);

    try {
      const { data } = await axios.request<T>({
        method,
        url: `${this.base}${route}`,
        data: body,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      return data;
    } catch (error) {
      throw new Error(`Failed to ${action}: ${describe(error)}`);
    }
  }

  create(slug: string, displayName: string) {
    return this.send<{ id: string }>('post', '', `create organization ${slug}`, {
      slug,
      displayName,
    });
  }

  /** By slug or id: the service accepts either. */
  get(org: string) {
    return this.send<Organization>('get', `/${encodeURIComponent(org)}`, `get organization ${org}`);
  }

  /** By id only, so the caller resolves a slug first. */
  addMember(id: string, userId: string, role: 'member' | 'admin') {
    return this.send<{ id: string }>('post', `/${encodeURIComponent(id)}/members`, 'add member', {
      userId,
      role,
    });
  }
}
