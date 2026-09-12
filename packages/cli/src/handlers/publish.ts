/* eslint-disable no-console */
import { AppshellManifest, AppshellTemplate, generateManifest, publish } from '@appshell/config';
import chalk from 'chalk';
import chokidar from 'chokidar';
import fs from 'fs';
import { ensureToken } from '../util/credentials';
import { identify } from '../util/identity';
import { resolveTemplate } from '../util/template';

export type PublishArgs = {
  registry: string;
  scopeId: string;
  template?: string;
  name?: string;
  packageVersion?: string;
  visibility?: 'public' | 'private';
  watch: boolean;
  force?: boolean;
};

const publishOnce = async (argv: PublishArgs) => {
  const { registry, force } = argv;
  const template = resolveTemplate(argv.template);
  // Whether a credential is required is the registry's policy, not ours: a
  // registry running AUTH_MODE=none needs none. A 401 says so precisely.
  const token = await ensureToken(registry);

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

  /*
   * Publishing does not activate. It used to, whenever an application happened to be
   * configured — so a setting that exists to address `app` commands silently decided that
   * publishing a package also changed what a running application serves.
   *
   * It failed in the worst shape available: the package published, activation 404'd
   * against an application nobody had created, and the command exited non-zero over work
   * that had in fact succeeded. Activation is `appshell app activate`, which says what it
   * does and can fail on its own.
   */
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

  // The resolved path, not the raw argument: watching an unresolved default would watch
  // a file that does not exist and report success while never firing.
  const watched = resolveTemplate(argv.template);

  console.log(chalk.blue(`Watching ${watched} for changes. Ctrl-C to stop.`));
  chokidar
    .watch(watched, { ignoreInitial: true, awaitWriteFinish: true })
    .on('change', run)
    .on('add', run);

  // Watching is the command; resolving here would let the process exit.
  await new Promise(() => {});
};
