/* eslint-disable no-console */
import {
  Advise,
  AppshellManifest,
  AppshellTemplate,
  generateManifest,
  publish,
  PublishError,
  PublishOptions,
} from '@appshell/config';
import chalk from 'chalk';
import chokidar from 'chokidar';
import fs from 'fs';
import { ensureToken } from '../util/credentials';
import {
  actionsToken,
  actionsTokenAvailable,
  inGitHubActions,
  WorkflowClaims,
  workflowClaims,
} from '../util/github';
import { identify } from '../util/identity';
import { resolveTemplate } from '../util/template';

export type PublishArgs = {
  registry: string;
  /* Unused: the scope comes from the package name, or the registry falls back to the
   * publisher's own. Declared because it is a global option every handler receives. */
  defaultScope?: string;
  template?: string;
  name?: string;
  packageVersion?: string;
  visibility?: 'public' | 'private';
  watch: boolean;
  force?: boolean;
};

/** What a publish presents, and — when it is a workflow's token — what for and as whom. */
type Credential = { token?: string; audience?: string; workflow?: WorkflowClaims };

/** What the registry says, as a 401, to a workflow token while the feature is off. */
const DISABLED = /trusted publishing is not enabled/i;

/**
 * The credential for one publish request.
 *
 * In order: APPSHELL_TOKEN, then the stored credential for this registry (renewed if it
 * has expired), then — only when neither exists and this is a GitHub Actions job granted
 * `id-token: write` — an OIDC token the runner mints for this workflow. appshellhq/
 * appshell-services#51.
 *
 * Anything explicit wins because it was put there on purpose: a job that sets
 * APPSHELL_TOKEN, or logs in with a client secret, means to publish as that account, and
 * the workflow token is there whether anyone asked for it or not — a job needs
 * `id-token: write` for npm provenance, cloud logins and more.
 *
 * The workflow token is publish-only by design and never goes near `ensureToken`: the
 * registry accepts it on `POST /v1/packages` and nowhere else, and spends it there. So it
 * is minted here, per request — `--watch` mints one per republish — and never stored.
 *
 * Whether a credential is required at all is the registry's policy, not ours: a registry
 * running AUTH_MODE=none needs none, and a 401 says so precisely.
 */
const credentialFor = async (registry: string): Promise<Credential> => {
  const token = await ensureToken(registry);

  if (token || !actionsTokenAvailable()) {
    return { token };
  }

  // Exactly as configured, without a trailing slash. The registry compares `aud` with its
  // TRUSTED_PUBLISHING_AUDIENCE exactly, so this is the string that setting has to be.
  const audience = registry.replace(/\/+$/, '');
  const minted = await actionsToken(audience);

  return { token: minted, audience, workflow: workflowClaims(minted) };
};

/**
 * The job as a trust record sees it: `owner/repo/.github/workflows/file.yml@ref`, and its
 * environment. Printed so a record that does not match is obvious from the job log.
 */
const describeWorkflow = ({ job_workflow_ref: ref, repository, environment }: WorkflowClaims) => {
  const who = ref ?? repository;

  if (!who) return 'this workflow';

  return environment ? `${who}, environment ${environment}` : who;
};

/**
 * What a refusal should go on to say, when the default advice to log in is the wrong one.
 *
 * A workflow cannot log in. What refused it is either a trust record on the scope — a 403,
 * whose remedy is comparing the records with this job — or the registry's settings: trusted
 * publishing off, or an audience that is not the url the registry expects.
 *
 * A job that could have published as itself but was not granted `id-token: write` gets the
 * usual advice plus that, since a missing permission is otherwise invisible: the job simply
 * has no token, and the registry only ever sees nothing.
 */
const adviceFor = (
  { token, audience, workflow }: Credential,
  scopeId?: string,
): Advise | undefined => {
  if (workflow) {
    return (status, reason) => {
      if (status === 403) {
        return (
          `Check \`appshell trust list ${scopeId ?? '<scope>'}\` against this job's repository, ` +
          `workflow file and environment.`
        );
      }

      if (status !== 401) return undefined;

      if (DISABLED.test(reason)) {
        return (
          'This registry does not have trusted publishing enabled, so it accepts no workflow ' +
          'token: its operator sets TRUSTED_PUBLISHING_AUDIENCE. Until then, publish with ' +
          'APPSHELL_TOKEN.'
        );
      }

      if (/\baud\b|audience/i.test(reason)) {
        return (
          `The token was minted for ${audience}, which must equal the registry's ` +
          `TRUSTED_PUBLISHING_AUDIENCE exactly: point APPSHELL_REGISTRY at that url.`
        );
      }

      // The registry's reason is the whole story; logging in is not a remedy for a workflow.
      return '';
    };
  }

  if (!token && inGitHubActions()) {
    return (status) =>
      status === 401
        ? 'Run `appshell login` or set APPSHELL_TOKEN — or, to publish as this workflow with ' +
          'trusted publishing, grant the job `permissions: id-token: write`.'
        : undefined;
  }

  return undefined;
};

const refusedFor = (status: number, error: unknown) => (error as PublishError).status === status;

/**
 * Publishes, as a workflow when that is the credential, falling back to presenting nothing
 * when the registry turns out not to do trusted publishing.
 *
 * The fallback is for a registry that needs no credential at all — AUTH_MODE=none, which is
 * every local and throwaway one. Such a registry still recognises a GitHub token, and
 * refuses it because the feature is off, so a job with `id-token: write` (this repository's
 * own pipeline grants it workflow-wide) would otherwise fail against a registry it used to
 * publish to without trouble. If presenting nothing is refused too, the original refusal
 * is the one worth reading, since it names the setting.
 */
const send = async (options: PublishOptions, credential: Credential) => {
  const { token, workflow } = credential;

  if (workflow) {
    console.log(chalk.blue(`Publishing as ${describeWorkflow(workflow)}, via trusted publishing`));
  }

  try {
    return await publish({ ...options, token, advise: adviceFor(credential, options.scopeId) });
  } catch (error) {
    if (!workflow || !refusedFor(401, error) || !DISABLED.test((error as Error).message)) {
      throw error;
    }

    console.log(
      chalk.dim('The registry does not have trusted publishing enabled; trying without a token.'),
    );

    try {
      return await publish(options);
    } catch (anonymous) {
      throw refusedFor(401, anonymous) ? error : anonymous;
    }
  }
};

const publishOnce = async (argv: PublishArgs) => {
  const { registry, force } = argv;
  const template = resolveTemplate(argv.template);

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

  const { scopeId, name, version } = identify(process.cwd(), argv.name, argv.packageVersion);

  // Asked for last, immediately before the request it is for: a workflow token is
  // short-lived and single-use, and a build that fails above should not have minted one.
  const credential = await credentialFor(registry);
  const { id, created } = await send(
    { registry, scopeId, name, version, manifest, visibility, force },
    credential,
  );

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
