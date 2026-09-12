import fs from 'fs';
import os from 'os';
import path from 'path';
import yaml from 'yaml';
import axios from './axios';

export type Credential = {
  accessToken: string;
  refreshToken?: string;
  /** Epoch milliseconds. */
  expiresAt?: number;
  /**
   * Where this credential came from, so it can renew itself.
   *
   * A refresh token is useless without the issuer that minted it and the client it was
   * minted for, and neither is derivable from the registry url — an operator is free to
   * point several registries at one issuer, or one registry at an issuer that moves.
   * Captured at login for that reason.
   *
   * Optional because a credential written before this existed has neither; such a
   * credential simply cannot refresh, and the next login repairs it.
   */
  issuer?: string;
  clientId?: string;
};

/** Keyed by registry URL so one machine can hold tokens for several registries. */
type CredentialStore = Record<string, Credential>;

export const credentialsPath = () =>
  process.env.APPSHELL_CREDENTIALS || path.join(os.homedir(), '.appshell', 'credentials');

const read = (): CredentialStore => {
  const file = credentialsPath();
  if (!fs.existsSync(file)) {
    return {};
  }

  return (yaml.parse(fs.readFileSync(file, 'utf-8')) as CredentialStore) ?? {};
};

const write = (store: CredentialStore) => {
  const file = credentialsPath();
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, yaml.stringify(store), { mode: 0o600 });
  // writeFileSync only applies mode when creating, so an existing file keeps its old bits.
  fs.chmodSync(file, 0o600);
};

const key = (registry: string) => registry.replace(/\/$/, '');

export const saveCredential = (registry: string, credential: Credential) => {
  write({ ...read(), [key(registry)]: credential });
};

export const clearCredential = (registry: string) => {
  const store = read();
  delete store[key(registry)];
  write(store);
};

/**
 * The stored access token, or nothing if it has expired.
 *
 * APPSHELL_TOKEN wins so CI never depends on a writable home directory.
 *
 * Deliberately synchronous and deliberately does not refresh: callers that can await
 * should use `ensureToken`, which renews. This remains for the places that cannot —
 * `resolveContext` among them, which the webpack plugin calls while building.
 */
export const resolveToken = (registry: string): string | undefined => {
  if (process.env.APPSHELL_TOKEN) {
    return process.env.APPSHELL_TOKEN;
  }

  const credential = read()[key(registry)];
  if (!credential?.accessToken) {
    return undefined;
  }

  if (credential.expiresAt && credential.expiresAt <= Date.now()) {
    return undefined;
  }

  return credential.accessToken;
};

/** The subset of an OIDC token response this cares about. */
type Renewed = { access_token: string; refresh_token?: string; expires_in?: number };

/**
 * The stored access token, renewed first if it has expired.
 *
 * `appshell login` obtains a refresh token and, until this existed, nothing ever read it:
 * every expiry meant a full device-authorization flow — open a browser, enter a code,
 * approve — with the credential that would have avoided it sitting in the file.
 *
 * Renewal cannot widen what a caller may do. The issuer mints the new access token from
 * the account as it stands now, so a revoked role or a disabled account produces a weaker
 * token or none at all, never a stale stronger one.
 *
 * A failed renewal returns nothing rather than throwing. The caller's own 401 is the
 * better place to explain what to do, and a network blip on the way to the issuer should
 * not read as *you are logged out*.
 */
export const ensureToken = async (registry: string): Promise<string | undefined> => {
  if (process.env.APPSHELL_TOKEN) {
    return process.env.APPSHELL_TOKEN;
  }

  const credential = read()[key(registry)];

  if (!credential?.accessToken) return undefined;

  const expired = credential.expiresAt !== undefined && credential.expiresAt <= Date.now();

  if (!expired) return credential.accessToken;
  if (!credential.refreshToken || !credential.issuer || !credential.clientId) return undefined;

  try {
    const { data } = await axios.post<Renewed>(
      `${credential.issuer.replace(/\/$/, '')}/protocol/openid-connect/token`,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: credential.refreshToken,
        client_id: credential.clientId,
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    saveCredential(registry, {
      ...credential,
      accessToken: data.access_token,
      // Rotation is on by default in Keycloak, so the old refresh token may already be
      // spent. Keeping it when none comes back would store one that cannot be used twice.
      refreshToken: data.refresh_token ?? credential.refreshToken,
      expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
    });

    return data.access_token;
  } catch {
    return undefined;
  }
};
