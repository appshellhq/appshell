/* eslint-disable no-console */
import { utils } from '@appshell/config';
import chalk from 'chalk';
import fs from 'fs';
import { RegistryClient, Theme, ThemeResource } from '../../util/registry';

export type ThemeArgs = {
  registry: string;
  scopeId: string;
};

/**
 * Splits `scope/name@version`, `scope/name` or a bare `name`.
 *
 * A bare name resolves in the caller's scope, so `appshell theme get brand` works the way
 * `appshell app` does. Omitting the version resolves the highest published one.
 */
export const parseRef = (ref: string, defaultScope: string) => {
  const [coordinates, version] = ref.split('@');
  const parts = coordinates.split('/');

  if (parts.length > 2 || parts.some((part) => !part)) {
    throw new Error(`'${ref}' is not a theme reference. Expected 'scope/name@version'.`);
  }

  return parts.length === 2
    ? { scopeId: parts[0], name: parts[1], version }
    : { scopeId: defaultScope, name: parts[0], version };
};

export const list = async (argv: ThemeArgs & { scope?: string }) => {
  const themes = await new RegistryClient(argv.registry).listThemes(argv.scope ?? argv.scopeId);

  if (!themes.length) {
    console.log('No themes found.');
    return;
  }

  console.table(
    themes.map((theme) => ({
      ref: theme.id,
      visibility: theme.visibility,
      owner: theme.owner,
      derivedFrom: theme.derivedFrom ?? '',
    })),
  );
};

export const get = async (argv: ThemeArgs & { ref: string }) => {
  const { scopeId, name, version } = parseRef(argv.ref, argv.scopeId);
  const theme = await new RegistryClient(argv.registry).getTheme(scopeId, name, version);

  console.log(JSON.stringify(theme, null, 2));
};

/**
 * Forks a published theme into a file to edit.
 *
 * The values are written out in full rather than as a reference to the original, because
 * that is what a fork is here: publishing it severs the link, and nothing happens to it
 * when the original moves. `derivedFrom` is recorded so the catalogue can answer where
 * something came from, and carries no other meaning.
 *
 * Without this an author writes 41 roles twice by hand, which is the kind of task nobody
 * finishes.
 */
export const init = async (argv: ThemeArgs & { from: string; name?: string; out?: string }) => {
  const { scopeId, name, version } = parseRef(argv.from, argv.scopeId);
  const source = await new RegistryClient(argv.registry).getTheme(scopeId, name, version);

  const resource: ThemeResource = {
    apiVersion: 'registry.appshell.org/v1',
    kind: 'Theme',
    name: argv.name ?? `${source.name}-fork`,
    spec: {
      version: '1.0.0',
      tokens: source.tokens,
      visibility: 'private',
      derivedFrom: source.id,
    },
  };

  const yaml = utils.dump(resource);

  if (!argv.out) {
    console.log(yaml);
    return;
  }

  fs.writeFileSync(argv.out, yaml);
  console.log(chalk.green(`Wrote ${argv.out} from ${source.id}`));
  console.log(`Edit it, then: appshell theme publish -f ${argv.out}`);
};

export const publish = async (argv: ThemeArgs & { file: string }) => {
  if (!fs.existsSync(argv.file)) {
    throw new Error(`Theme file not found. ${argv.file}`);
  }

  const resource = utils.load<ThemeResource>(argv.file);

  // Checked here as well as server side so a typo costs no round trip, and so the message
  // names the file the author actually edited.
  if (!resource || typeof resource !== 'object') {
    throw new Error(`${argv.file} is empty or is not a mapping.`);
  }

  if (resource.kind !== 'Theme') {
    throw new Error(`${argv.file}: kind must be 'Theme', got '${resource.kind ?? 'undefined'}'.`);
  }

  if (!resource.name) {
    throw new Error(`${argv.file}: name is required.`);
  }

  if (!resource.spec?.version) {
    throw new Error(`${argv.file}: spec.version is required.`);
  }

  if (!resource.spec?.tokens?.light || !resource.spec?.tokens?.dark) {
    throw new Error(`${argv.file}: spec.tokens needs both a light and a dark map.`);
  }

  const { id, created } = await new RegistryClient(argv.registry).publishTheme({
    name: resource.name,
    version: resource.spec.version,
    tokens: resource.spec.tokens,
    visibility: resource.spec.visibility,
    derivedFrom: resource.spec.derivedFrom,
    metadata: resource.spec.metadata,
  });

  console.log(chalk.green(`${created ? 'Published' : 'Already published'} ${id}`));

  if (created) {
    console.log(`Adopt it with: theme: { ref: '${id}' } in your appshell.app.yaml`);
  }
};

export type { Theme };
