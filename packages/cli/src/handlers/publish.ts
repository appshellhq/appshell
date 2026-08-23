/* eslint-disable no-console */
import { activate, AppshellManifest, generateManifest, publish } from '@appshell/config';
import chalk from 'chalk';
import chokidar from 'chokidar';
import fs from 'fs';
import { requireToken } from '../util/credentials';
import { identify } from '../util/identity';
import { parseEnvironment } from '../util/registry';

export type PublishArgs = {
  registry: string;
  environment?: string;
  scopeId: string;
  template: string;
  name?: string;
  version?: string;
  visibility?: 'public' | 'private';
  watch: boolean;
};

const publishOnce = async (argv: PublishArgs) => {
  const { registry, environment, scopeId, template, visibility } = argv;
  const token = requireToken(registry);

  if (!fs.existsSync(template)) {
    throw new Error(`Manifest template not found. ${template}`);
  }

  const manifest = (await generateManifest(template)) as AppshellManifest | undefined;
  if (!manifest) {
    throw new Error(`No manifest was generated from ${template}.`);
  }

  const { name, version } = identify(process.cwd(), argv.name, argv.version);
  const { id, created } = await publish({
    registry,
    token,
    name,
    version,
    manifest,
    visibility,
  });

  console.log(chalk.green(`${created ? 'Published' : 'Already published'} ${id}`));

  if (environment) {
    const { scopeId: envScope, name: envName } = parseEnvironment(environment, scopeId);
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
