import {
  getInstance,
  init,
  loadRemote,
  registerRemotes,
} from '@module-federation/enhanced/runtime';

const HOST_NAME = 'Appshell';

// The runtime instance and each remote's registration only need to happen once per page load.
let initialized = false;
const registeredScopes = new Set<string>();

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
) => {
  // eslint-disable-next-line no-console
  console.debug(
    `loading Appshell component: { scope: ${scope}, module: ${module}, shareScope: ${shareScope} }`,
  );

  ensureInitialized();

  // Registered exactly once, and never re-registered or cache-busted afterwards.
  //
  // A remote served by a dev server updates itself: its `remoteEntry` already carries
  // webpack's HMR runtime and a dev-server client, so an edit is applied in place
  // behind a container identity that does not move. Re-registering the same scope, or
  // appending a cache-busting query to its entry, changes that identity and the
  // `publicPath` derived from it mid-flight, which strands the `*.hot-update.json` and
  // `*.hot-update.js` requests the remote is midway through making.
  if (!registeredScopes.has(scope)) {
    registeredScopes.add(scope);
    registerRemotes([{ name: scope, entry: remoteEntryUrl }]);
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
