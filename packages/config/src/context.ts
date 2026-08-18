import os from 'os';
import path from 'path';
import { resolveToken } from './credentials';
import { readConfig } from './utils/config';

export type AppshellContext = {
  registry?: string;
  /** Activation target as `scope/name`. */
  environment?: string;
  scopeId: string;
  token?: string;
};

const configPath = () =>
  process.env.APPSHELL_CONFIG || path.join(os.homedir(), '.appshell', 'config');

const qualify = (name: string | undefined, scopeId: string): string | undefined => {
  if (!name) {
    return undefined;
  }

  return name.includes('/') ? name : `${scopeId}/${name}`;
};

/**
 * The registry, environment, and token a developer is working against, resolved
 * the way the CLI resolves them: env var, then `~/.appshell/config`, then a
 * default. This lets the webpack plugin defer to `appshell config set` and
 * `appshell login` instead of requiring per-project configuration.
 */
export const resolveContext = (): AppshellContext => {
  const config = readConfig(configPath());
  const scopeId = process.env.APPSHELL_SCOPE_ID || config.scopeId || 'default';
  const environment = qualify(process.env.APPSHELL_ENVIRONMENT || config.environment, scopeId);
  const registry = process.env.APPSHELL_REGISTRY || config.registry;
  const token = registry ? resolveToken(registry) : process.env.APPSHELL_TOKEN;

  return { registry, environment, scopeId, token };
};

/**
 * What `~/.appshell/config` alone declares, so a caller can warn when an env var
 * or an explicit option points somewhere other than the developer's CLI context.
 */
export const persistedContext = (): { registry?: string; environment?: string } => {
  const config = readConfig(configPath());
  const scopeId = config.scopeId || 'default';

  return { registry: config.registry, environment: qualify(config.environment, scopeId) };
};
