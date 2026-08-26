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
    return { name: nameOverride, version: versionOverride };
  }

  const packageFile = path.resolve(cwd, 'package.json');
  if (!fs.existsSync(packageFile)) {
    throw new Error(`Cannot determine which package this is: no package.json at ${cwd}.`);
  }

  const { name, version } = JSON.parse(fs.readFileSync(packageFile, 'utf-8'));
  const resolved = {
    name: nameOverride ?? (name as string | undefined)?.replace(/^@[^/]+\//, ''),
    version: versionOverride ?? (version as string | undefined),
  };

  if (!resolved.name || !resolved.version) {
    throw new Error(`Cannot determine which package this is: ${packageFile} needs a name and version.`);
  }

  return resolved as { name: string; version: string };
};

export default identify;
