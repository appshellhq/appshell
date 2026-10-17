import { parsePackageName } from '@appshell/config';
import { resolveScopeId } from './scope';

/**
 * A package as it is named on the command line, split into where it lives and what it is.
 *
 * Three forms, each with an optional `@version`:
 *
 * - `scope/name`, the registry's own address, which publish prints;
 * - `@scope/name`, npm's, as package.json spells it;
 * - a bare `name`, whose scope is resolved (`resolveScopeId`).
 *
 * One definition because every command that takes a name had its own copy, and the copies
 * disagreed. Five split on `/` and so read `@acme/checkout` as scope `@acme`; `unpublish`,
 * `restore` and `purge` didn't split at all, so `unpublish acme/checkout 1.0.0` asked for
 * `acme/acme/checkout`, the form publish had just printed.
 */
export type PackageAddress = { scopeId?: string; name: string; version?: string };

const invalid = (raw: string) =>
  new Error(
    `'${raw}' is not a package name: use 'name', 'scope/name' or '@scope/name', ` +
      "with '@version' where a version is meant.",
  );

export const parseAddress = (raw: string): PackageAddress => {
  // A version follows the last `@` that isn't the first character: npm's scope sigil is.
  const at = raw.lastIndexOf('@');
  const [reference, version] = at > 0 ? [raw.slice(0, at), raw.slice(at + 1)] : [raw, undefined];

  // Nothing a version can contain is a path: one with a slash would land in a url's path.
  if (version === '' || version?.includes('/')) throw invalid(raw);

  const npm = parsePackageName(reference);
  // npm's sigil with nothing npm would read after it, such as `@/checkout`, names no scope.
  if (reference.startsWith('@') && !npm.scopeId) throw invalid(raw);

  const parts = npm.scopeId ? [npm.scopeId, npm.name] : reference.split('/');

  if (parts.length > 2 || parts.some((part) => !part || part.includes('/'))) {
    throw invalid(raw);
  }

  const [scopeId, name] = parts.length === 2 ? parts : [undefined, parts[0]];

  return { ...(scopeId ? { scopeId } : {}), name, ...(version ? { version } : {}) };
};

/**
 * What a command does with a version in the name (Copilot on appshellhq/appshell#39):
 *
 * - `none`: the command applies to every version, so a version is refused rather than
 *   dropped. Dropped, `packages visibility acme/checkout@1.2.3 public` reclassified releases
 *   nobody named.
 * - `optional`: the version the name carries, if any.
 * - `{ positional }`: the version is its own argument, and one in the name must agree with
 *   it. Otherwise `purge acme/checkout@1.2.3 2.0.0 --yes` deleted 2.0.0 for good.
 */
export type VersionRule = 'none' | 'optional' | { positional: string };

/**
 * The package a command names, with its scope: the one the name carries, else `--scope`
 * where the command has it, else the one the account resolves to.
 */
export const resolvePackage = async (
  argv: { name: string; registry: string; defaultScope?: string; scope?: string },
  versions: VersionRule,
): Promise<{ scopeId: string; name: string; version?: string }> => {
  const { scopeId, name, version } = parseAddress(argv.name);

  if (version && versions === 'none') {
    throw new Error(
      `'${argv.name}' names a version, but this applies to every version of the package: ` +
        `name it without '@${version}'.`,
    );
  }

  if (typeof versions === 'object' && version && version !== versions.positional) {
    throw new Error(
      `'${argv.name}' names version ${version}, but the command was given ` +
        `${versions.positional}. Name the version once.`,
    );
  }

  const resolved = typeof versions === 'object' ? versions.positional : version;

  return {
    scopeId: scopeId ?? argv.scope ?? (await resolveScopeId(argv)),
    name,
    ...(resolved ? { version: resolved } : {}),
  };
};
