import { parsePackageName } from '@appshell/config';
import fs from 'fs';
import path from 'path';

/**
 * The registry needs a lowercase name and a version; module federation config carries
 * neither, so identity comes from the package being worked on. The npm scope is
 * stripped because the registry takes scope from the caller's token instead.
 *
 * Shared so that `publish` and `dev` always agree on which package the current directory
 * is — an overlay that redirected a different package than the one you published would be
 * a confusing way to find out they had drifted.
 */
export const identify = (cwd: string, nameOverride?: string, versionOverride?: string) => {
  if (nameOverride && versionOverride) {
    // Explicit overrides name the package outright, so there is no manifest to read a
    // declared scope from — it falls back to the publisher's own, as it always did.
    return { name: nameOverride, version: versionOverride };
  }

  const packageFile = path.resolve(cwd, 'package.json');
  if (!fs.existsSync(packageFile)) {
    throw new Error(`Cannot determine which package this is: no package.json at ${cwd}.`);
  }

  const { name, version } = JSON.parse(fs.readFileSync(packageFile, 'utf-8'));
  // The scope is kept rather than stripped: `@acme/checkout` says where it belongs, in a
  // file under review, identically for everyone who publishes it.
  const declared = name ? parsePackageName(name as string) : undefined;
  const resolved = {
    scopeId: declared?.scopeId,
    name: nameOverride ?? declared?.name,
    version: versionOverride ?? (version as string | undefined),
  };

  if (!resolved.name || !resolved.version) {
    throw new Error(
      `Cannot determine which package this is: ${packageFile} needs a name and version.`,
    );
  }

  return resolved as { scopeId?: string; name: string; version: string };
};

export default identify;
