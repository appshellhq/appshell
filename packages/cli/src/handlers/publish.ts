/* eslint-disable no-console */
import {
  activate,
  AppshellManifest,
  AppshellTemplate,
  generateManifest,
  publish,
} from '@appshell/config';
import chalk from 'chalk';
import chokidar from 'chokidar';
import fs from 'fs';
import { resolveToken } from '../util/credentials';
import { identify } from '../util/identity';
import { parseApplication } from '../util/registry';

export type PublishArgs = {
  registry: string;
  application?: string;
  scopeId: string;
  template: string;
  name?: string;
  packageVersion?: string;
  visibility?: 'public' | 'private';
  watch: boolean;
  force?: boolean;
};

const publishOnce = async (argv: PublishArgs) => {
  const { registry, application, scopeId, template, force } = argv;
  // Whether a credential is required is the registry's policy, not ours: a
  // registry running AUTH_MODE=none needs none. A 401 says so precisely.
  const token = resolveToken(registry);

  if (!fs.existsSync(template)) {
    throw new Error(`Manifest template not found. ${template}`);
  }

  const manifest = (await generateManifest(template)) as AppshellManifest | undefined;
  if (!manifest) {
    throw new Error(`No manifest was generated from ${template}.`);
  }

  /*
   * Read off the template rather than the manifest: visibility is declared in
   * appshell.config.yaml and carried through the build, but never mapped into the
   * manifest, because the manifest is hashed into the package digest and visibility is
   * not part of what a package *is*. The flag overrides it; absent both, the registry
   * applies its own default, which is private.
   */
  const declared = (JSON.parse(fs.readFileSync(template, 'utf-8')) as AppshellTemplate).visibility;
  const visibility = argv.visibility ?? declared;

  const { name, version } = identify(process.cwd(), argv.name, argv.packageVersion);
  const { id, created } = await publish({
    registry,
    token,
    name,
    version,
    manifest,
    visibility,
    force,
  });

  console.log(chalk.green(`${created ? 'Published' : 'Already published'} ${id}`));

  if (application) {
    const { scopeId: envScope, name: envName } = parseApplication(application, scopeId);
    await activate(registry, `${envScope}/${envName}`, id, token);
    console.log(chalk.green(`Activated ${id} in ${envScope}/${envName}`));
  }

  return id;
};

export default async (argv: PublishArgs) => {
  if (!argv.watch) {
    await publishOnce(argv);
    return;
  }

  const run = async () => {
    try {
      await publishOnce(argv);
    } catch (err) {
      console.error(chalk.red((err as Error).message));
    }
  };

  await run();

  console.log(chalk.blue(`Watching ${argv.template} for changes. Ctrl-C to stop.`));
  chokidar
    .watch(argv.template, { ignoreInitial: true, awaitWriteFinish: true })
    .on('change', run)
    .on('add', run);

  // Watching is the command; resolving here would let the process exit.
  await new Promise(() => {});
};
