import os from 'os';
import path from 'path';
import { resolveToken } from './credentials';
import { readConfig, resolveDefaultScope } from './utils/config';

export type AppshellContext = {
  registry?: string;
  /** Activation target as `scope/name`. */
  application?: string;
  /**
   * The addressing default, if one is configured. Optional because there is no honest
   * value to invent when there is not — see `qualify`.
   */
  scopeId?: string;
  token?: string;
};

const configPath = () =>
  process.env.APPSHELL_CONFIG || path.join(os.homedir(), '.appshell', 'config');

/**
 * Turns `name` into `scope/name`, or leaves it alone when there is no scope to use.
 *
 * It used to substitute the literal `default`, which named a scope nobody owns and nothing
 * can publish into — so an unqualified application became `default/thing`, and the plugin
 * activated into a namespace guaranteed to be empty. `activate` refuses an unqualified
 * value with `Invalid application 'thing'. Expected 'scope/name'.`, which is both true and
 * actionable; `default/thing` was neither.
 *
 * The plugin cannot do better than this. It has no account to ask at build time, so the
 * choice is between saying nothing and inventing an answer, and the invented one failed
 * silently.
 */
const qualify = (name: string | undefined, scopeId?: string): string | undefined => {
  if (!name) {
    return undefined;
  }

  return name.includes('/') || !scopeId ? name : `${scopeId}/${name}`;
};

/**
 * The registry, application, and token a developer is working against, resolved
 * the way the CLI resolves them: env var, then `~/.appshell/config`, then a
 * default. This lets the webpack plugin defer to `appshell config set` and
 * `appshell login` instead of requiring per-project configuration.
 */
export const resolveContext = (): AppshellContext => {
  const config = readConfig(configPath());
  const scopeId = resolveDefaultScope(config);
  const application = qualify(process.env.APPSHELL_APPLICATION || config.application, scopeId);
  const registry = process.env.APPSHELL_REGISTRY || config.registry;
  const token = registry ? resolveToken(registry) : process.env.APPSHELL_TOKEN;

  return { registry, application, scopeId, token };
};

/**
 * What `~/.appshell/config` alone declares, so a caller can warn when an env var
 * or an explicit option points somewhere other than the developer's CLI context.
 */
export const persistedContext = (): { registry?: string; application?: string } => {
  const config = readConfig(configPath());
  const scopeId = resolveDefaultScope(config, {});

  return { registry: config.registry, application: qualify(config.application, scopeId) };
};
