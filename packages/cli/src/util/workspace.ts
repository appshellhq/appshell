import { AppshellConfig, utils } from '@appshell/config';
import fg from 'fast-glob';
import fs from 'fs';
import path from 'path';

export type WorkspacePackage = {
  dir: string;
  /** Registry identity: the unscoped package name, matching what `publish` sends. */
  name: string;
  version: string;
  /** Remote keys this package declares, which is how an overlay is traced back to it. */
  remotes: string[];
};

export type Workspace = {
  root: string;
  packages: WorkspacePackage[];
};

const readJson = (file: string) => JSON.parse(fs.readFileSync(file, 'utf-8'));

/**
 * npm/yarn/pnpm-style `workspaces` first, then lerna's `packages`. Both are just a
 * list of globs, and a repo that uses lerna on top of npm workspaces declares the
 * same members twice, so either one answers the question.
 */
const patternsOf = (dir: string): string[] | undefined => {
  const packageFile = path.join(dir, 'package.json');

  if (fs.existsSync(packageFile)) {
    const { workspaces } = readJson(packageFile);
    const patterns: string[] | undefined = Array.isArray(workspaces)
      ? workspaces
      : workspaces?.packages;

    if (patterns?.length) return patterns;
  }

  const lernaFile = path.join(dir, 'lerna.json');

  if (fs.existsSync(lernaFile)) {
    const { packages } = readJson(lernaFile);
    if (packages?.length) return packages as string[];
  }

  return undefined;
};

/** The nearest ancestor that declares workspace members, starting with `from` itself. */
export const findWorkspaceRoot = (from: string): string | undefined => {
  let dir = path.resolve(from);

  for (;;) {
    if (patternsOf(dir)) return dir;

    const parent = path.dirname(dir);
    if (parent === dir) return undefined;

    dir = parent;
  }
};

/**
 * A workspace member is an appshell pkg when it has an `appshell.config.yaml`. That is
 * what separates the micro-frontends from the plain libraries sitting beside them, and
 * it is a local signal, so this works before anything has been published.
 */
const packageAt = (dir: string): WorkspacePackage | undefined => {
  const configFile = path.join(dir, 'appshell.config.yaml');
  const packageFile = path.join(dir, 'package.json');

  if (!fs.existsSync(configFile) || !fs.existsSync(packageFile)) return undefined;

  const { name, version } = readJson(packageFile);
  if (!name || !version) return undefined;

  try {
    const config = utils.load<AppshellConfig>(configFile);

    return {
      dir,
      name: (name as string).replace(/^@[^/]+\//, ''),
      version,
      remotes: Object.keys(config?.remotes ?? {}),
    };
  } catch {
    // An unreadable config means we cannot say what this package exposes, and reporting
    // the rest of the workspace is more useful than failing the whole command.
    return undefined;
  }
};

export const findWorkspace = (from: string): Workspace | undefined => {
  const root = findWorkspaceRoot(from);
  if (!root) return undefined;

  const patterns = (patternsOf(root) ?? []).map((pattern) => pattern.replace(/\/+$/, ''));
  const dirs = fg.sync(patterns, {
    cwd: root,
    absolute: true,
    onlyDirectories: true,
    ignore: ['**/node_modules/**'],
  });

  const packages = dirs
    .map(packageAt)
    .filter((pkg): pkg is WorkspacePackage => Boolean(pkg))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { root, packages };
};

export default findWorkspace;
