/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';

export const TEMPLATE_NAME = 'appshell.template.json';

/** Deep enough to reach a build output directory, shallow enough not to crawl a repo. */
const MAX_DEPTH = 4;
const SKIP = new Set(['node_modules', '.git', 'coverage', '.next', '.turbo']);

const find = (dir: string, depth = 0): string[] => {
  if (depth > MAX_DEPTH) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  return entries.flatMap((entry) => {
    if (entry.isDirectory()) {
      return SKIP.has(entry.name) ? [] : find(path.join(dir, entry.name), depth + 1);
    }

    return entry.name === TEMPLATE_NAME ? [path.join(dir, entry.name)] : [];
  });
};

/**
 * Where the template actually is, rather than where a default guessed.
 *
 * The plugin emits it into webpack's `output.path` — `dist` by convention, but the build
 * decides, and the cli cannot read a webpack config to find out. Defaulting to a
 * cwd-relative name meant the documented invocation failed for every project that builds
 * into a directory, with an error naming a file that was never going to be there.
 *
 * An explicit `--template` is taken at its word and never searched for: a path someone
 * supplied and got wrong should say so, not silently resolve elsewhere.
 */
export const resolveTemplate = (explicit: string | undefined, cwd = process.cwd()): string => {
  if (explicit) {
    if (!fs.existsSync(explicit)) {
      throw new Error(`Manifest template not found: ${explicit}`);
    }

    return explicit;
  }

  const conventional = path.join(cwd, TEMPLATE_NAME);
  if (fs.existsSync(conventional)) {
    return conventional;
  }

  const found = find(cwd);

  if (found.length === 1) {
    console.log(`Using ${path.relative(cwd, found[0])}`);

    return found[0];
  }

  if (found.length > 1) {
    const list = found.map((f) => `  ${path.relative(cwd, f)}`).join('\n');

    throw new Error(`Several manifest templates found; pass --template to choose one:\n${list}`);
  }

  throw new Error(
    `No ${TEMPLATE_NAME} found under ${cwd}. Build the package first, or pass --template.`,
  );
};

export default resolveTemplate;
