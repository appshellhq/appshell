import {
  getInstance,
  init,
  loadRemote,
  registerRemotes,
} from '@module-federation/enhanced/runtime';

const HOST_NAME = 'appshell-host';

// The runtime instance and each remote's registration only need to happen once per page load.
let initialized = false;
const registeredScopes = new Set<string>();
const registeredEntries = new Map<string, string>();

export type LoadAppshellComponentOptions = {
  forceReload?: boolean;
  cacheBust?: string;
};

const withCacheBust = (url: string, cacheBust?: string): string => {
  if (!cacheBust) return url;

  try {
    const parsed = new URL(url);
    parsed.searchParams.set('__appshell_hmr', cacheBust);
    return parsed.toString();
  } catch {
    return url;
  }
};

const ensureInitialized = () => {
  if (initialized) return;
  initialized = true;

  // A host that ships its own ModuleFederationPlugin (e.g. @appshell/react-shell) already
  // created the global federation instance during its own bootstrap. Re-calling `init()`
  // with a different name throws (#RUNTIME-010), so reuse whatever instance already exists.
  if (getInstance()) return;

  init({ name: HOST_NAME, remotes: [] });
};

export default async <TComponent>(
  scope: string,
  module: string,
  remoteEntryUrl: string,
  shareScope = 'default',
  options: LoadAppshellComponentOptions = {},
) => {
  // eslint-disable-next-line no-console
  console.debug(
    `loading Appshell component: { scope: ${scope}, module: ${module}, shareScope: ${shareScope} }`,
  );

  ensureInitialized();

  const entry = withCacheBust(remoteEntryUrl, options.cacheBust);
  // The caller (dev HMR watcher) decides when to force a reload; don't gate on NODE_ENV here
  // since this package is built in production mode and consumed by dev apps.
  const shouldForceReload = Boolean(options.forceReload || options.cacheBust);

  if (!registeredScopes.has(scope)) {
    registeredScopes.add(scope);
    registeredEntries.set(scope, entry);
    registerRemotes([{ name: scope, entry }]);
  } else if (shouldForceReload || registeredEntries.get(scope) !== entry) {
    // eslint-disable-next-line no-console
    console.log(`[appshell-hmr] force re-register remote ${scope} -> ${entry}`);
    registeredEntries.set(scope, entry);
    registerRemotes([{ name: scope, entry }], { force: true });
  }

  // Federation ids drop the leading `./` that `exposes` keys use.
  const exposed = module.replace(/^\.\//, '');
  const Module = await loadRemote<{ default: TComponent }>(`${scope}/${exposed}`);

  if (!Module) {
    throw new Error(`Failed to find module container ${scope}`);
  }

  // eslint-disable-next-line no-console
  console.debug(
    `Appshell component loaded: { scope: ${scope}, module: ${module}, shareScope: ${shareScope} }`,
  );

  return Module.default;
};
