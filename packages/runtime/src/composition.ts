/* eslint-disable no-underscore-dangle, @typescript-eslint/naming-convention */
import { MissingCompositionError } from './errors';
import type { AppshellRemote, Metadata } from './wire';

/**
 * What a container needs from the page to lay an application out: every remote the
 * application activated, with the metadata each package published, and the path the
 * application is served under.
 *
 * The registry inlines the whole composition as `window.__appshell_config__`, and until
 * these accessors only the shell read it. A container such as the workspace builds its
 * navigation and its routes from the remotes' metadata, so it needs the same list, and
 * reading the global directly would make every field of the payload a contract by
 * accident. These expose the two parts a container needs and nothing else: not the vars,
 * which each package reads as its own through `@appshell/runtime/vars`, and not the index
 * or the overlay, which are the shell's business.
 *
 * Appshell still never reads metadata. Its keys are whatever the container that reads them
 * defines and documents.
 *
 * The global is read through a cast rather than declared on `Window`, because
 * `@appshell/loader` already declares it with its full type, and a second declaration of
 * the same property with another type fails to compile wherever both are in scope.
 */
type Inlined = { remotes: Record<string, AppshellRemote<unknown>>; basePath?: unknown };

const isComposition = (value: unknown): value is Inlined => {
  if (typeof value !== 'object' || value === null) return false;

  const { remotes } = value as Record<string, unknown>;

  return typeof remotes === 'object' && remotes !== null && !Array.isArray(remotes);
};

/**
 * Unlike `getIdentity`, this throws rather than returning something empty. A container with
 * no composition can't do its job, and an empty one would render a navigation with nothing
 * in it and no sign of why. The shell never mounts a remote without a composition, so its
 * absence means the code is running outside an appshell page: a test, a storybook, a direct
 * import.
 */
const inlined = (): Inlined => {
  const value =
    typeof window === 'undefined'
      ? undefined
      : (window as unknown as { __appshell_config__?: unknown }).__appshell_config__;

  if (!isComposition(value)) throw new MissingCompositionError();

  return value;
};

/**
 * Every remote the application activated, by the key `RemoteSlot` mounts it with
 * (`scope/package/Component`), with the metadata its package published.
 *
 * `TMetadata` is what the caller says the metadata is, not something checked: each
 * package's metadata is whatever it published, so a container validates the keys it reads.
 *
 * A typed accessor, not a boundary, like `getIdentity`: any script on the page can read the
 * composition directly.
 */
export const getRemotes = <TMetadata = Metadata>(): Readonly<
  Record<string, Readonly<AppshellRemote<TMetadata>>>
> => inlined().remotes as Record<string, AppshellRemote<TMetadata>>;

/**
 * The path the application is served under, for its router to take as its base:
 * `/a/{scope}/{name}` on the shared serving plane, or the application's mount on a host of
 * its own, `/` included.
 *
 * `/` when the registry sent none: registries before appshellhq/appshell-services#68 served
 * an application only under `/a/{scope}/{name}` and didn't say so.
 */
export const getBasePath = (): string => {
  const { basePath } = inlined();

  return typeof basePath === 'string' && basePath.startsWith('/') ? basePath : '/';
};
