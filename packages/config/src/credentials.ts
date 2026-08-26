import fs from 'fs';
import os from 'os';
import path from 'path';
import yaml from 'yaml';

export type Credential = {
  accessToken: string;
  refreshToken?: string;
  /** Epoch milliseconds. */
  expiresAt?: number;
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
 * APPSHELL_TOKEN wins so CI never depends on a writable home directory.
 * Expired tokens are treated as absent; refresh is the caller's concern.
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
