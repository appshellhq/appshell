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

  if (version === '') throw invalid(raw);

  const npm = parsePackageName(reference);
  const parts = npm.scopeId ? [npm.scopeId, npm.name] : reference.split('/');

  if (parts.length > 2 || parts.some((part) => !part || part.includes('/'))) {
    throw invalid(raw);
  }

  const [scopeId, name] = parts.length === 2 ? parts : [undefined, parts[0]];

  return { ...(scopeId ? { scopeId } : {}), name, ...(version ? { version } : {}) };
};

/**
 * The package a command names, with its scope: the one the name carries, else `--scope`
 * where the command has it, else the one the account resolves to.
 */
export const resolvePackage = async (argv: {
  name: string;
  registry: string;
  defaultScope?: string;
  scope?: string;
}): Promise<
  Required<Pick<PackageAddress, 'scopeId' | 'name'>> & Pick<PackageAddress, 'version'>
> => {
  const { scopeId, name, version } = parseAddress(argv.name);

  return {
    scopeId: scopeId ?? argv.scope ?? (await resolveScopeId(argv)),
    name,
    ...(version ? { version } : {}),
  };
};
