/* eslint-disable no-console */
import chalk from 'chalk';
import { spawn } from 'child_process';
import { readDevHint, verifyDevHint } from '../util/devHint';
import { identify } from '../util/identity';
import { findWorkspace, WorkspaceApp } from '../util/workspace';
import {
  CreateOverlayBody,
  OpenOverlay,
  OverlayRemoteBody,
  parseEnvironment,
  RegistryClient,
} from '../util/registry';

export type DevArgs = {
  registry: string;
  scopeId: string;
  environment?: string;
  app?: string;
  url?: string;
  port?: number;
  remote?: string[];
  shell: 'prod' | 'dev';
  open: boolean;
  id?: string;
  all?: boolean;
};

const target = (argv: DevArgs) => {
  if (!argv.environment) {
    throw new Error(
      "No environment given. Pass --environment or set one with 'appshell config set environment <name>'.",
    );
  }

  return parseEnvironment(argv.environment, argv.scopeId);
};

/**
 * Where this app is running locally. A port is what a developer actually knows, so it
 * is the ergonomic form; `--url` covers everything else, such as a devbox or Codespace
 * that is not on localhost.
 *
 * Deliberately not inferred from the app's own config. `${SOME_APP_URL}` resolves to
 * wherever the loaded build context says the app is served from, which is not the same
 * question — with a staging env file loaded it would resolve to the deployed URL and
 * mint an overlay that redirects an app to where it already points, silently doing
 * nothing in exactly the case this feature exists for.
 */
const localOrigin = (argv: DevArgs): string | undefined => {
  if (argv.url) return argv.url;

  return argv.port ? `http://localhost:${argv.port}` : undefined;
};

/**
 * Swaps in the origin the dev server is actually listening on, keeping the path the
 * manifest already describes. A published app usually points at a CDN, and the whole
 * point of an overlay is to aim that same remote somewhere local instead.
 */
const withOrigin = (url: string, origin?: string): string => {
  if (!origin) return url;

  const replacement = new URL(origin);
  const original = new URL(url);
  original.protocol = replacement.protocol;
  original.host = replacement.host;

  return original.toString();
};

/**
 * The overlay redirects exactly the remotes this app has published into the target
 * environment, asked of the registry rather than read out of a local build. The
 * registry is the only thing that knows what is actually activated there, and it
 * answers without this app having been built in the current working tree at all.
 */
const remotesOf = async (
  argv: DevArgs,
  client: RegistryClient,
  scopeId: string,
): Promise<Record<string, OverlayRemoteBody>> => {
  const explicit = localOrigin(argv);
  // An explicit port or url always wins. The hint cannot know about a devbox or
  // Codespace where the browser reaches this app somewhere other than where it binds.
  const hint = explicit ? undefined : readDevHint(process.cwd());

  // Nothing to point at and nothing to ask: the overlay still carries the shell flavor,
  // which is the half that matters where the environment already resolves to localhost.
  if (!explicit && !hint) return {};

  const app = argv.app ?? identify(process.cwd()).name;
  const { remotes } = await client.appManifest(scopeId, app);

  if (!remotes || !Object.keys(remotes).length) {
    throw new Error(`${scopeId}/${app} publishes no remotes.`);
  }

  const wanted = argv.remote?.length ? new Set(argv.remote) : undefined;
  const missing = [...(wanted ?? [])].filter((key) => !remotes[key]);

  if (missing.length) {
    throw new Error(`${scopeId}/${app} does not publish ${missing.join(', ')}.`);
  }

  const selected = Object.entries(remotes).filter(([key]) => !wanted || wanted.has(key));
  let origin = explicit;

  if (!origin && hint) {
    const serving = await verifyDevHint(
      hint,
      selected.map(([key]) => key),
    );

    if (serving) {
      origin = hint.origin;
      console.log(chalk.dim(`Found ${app} serving at ${hint.origin}`));
    } else {
      console.log(
        chalk.yellow(
          `${hint.origin} is not serving ${app} any more; ignoring the stale dev-server hint.`,
        ),
      );
    }
  }

  if (!origin) return {};

  return selected.reduce<Record<string, OverlayRemoteBody>>(
    (acc, [key, remote]) => ({
      ...acc,
      [key]: {
        remoteEntryUrl: withOrigin(remote.remoteEntryUrl, origin),
        manifestUrl: withOrigin(remote.manifestUrl, origin),
      },
    }),
    {},
  );
};

const OPENERS: Record<string, string> = { darwin: 'open', win32: 'start' };

const launch = (url: string) => {
  const command = OPENERS[process.platform] ?? 'xdg-open';

  try {
    // The URL is already on screen, so a browser that refuses to open is not fatal.
    spawn(command, [url], { detached: true, stdio: 'ignore', shell: process.platform === 'win32' })
      .on('error', () => undefined)
      .unref();
  } catch {
    // Same reasoning.
  }
};

const describeOverlay = (overlay: OpenOverlay) =>
  [
    overlay.shellFlavor === 'dev' && 'development shell',
    overlay.remotes.length && `${overlay.remotes.length} redirected`,
  ]
    .filter(Boolean)
    .join(', ') || 'no changes';

export const start = async (argv: DevArgs) => {
  const { scopeId, name } = target(argv);
  const client = new RegistryClient(argv.registry);
  const remotes = await remotesOf(argv, client, scopeId);
  const body: CreateOverlayBody = { remotes, shellFlavor: argv.shell };
  const overlay = await client.createOverlay(scopeId, name, body);
  const confirmUrl = `${client.baseUrl}${overlay.confirmUrl}`;

  // The registry keeps one overlay per developer per environment, so this may have
  // extended an existing one; report what is in effect now, not just what was sent.
  const carried = overlay.remotes.filter((key) => !remotes[key]);

  console.log(chalk.green(`\nOverlay ${carried.length ? 'extended' : 'opened'} on ${scopeId}/${name}`));
  Object.entries(remotes).forEach(([key, remote]) => {
    console.log(`  ${key} ${chalk.dim('->')} ${remote.remoteEntryUrl}`);
  });
  carried.forEach((key) => {
    console.log(`  ${key} ${chalk.dim('-> still redirected from an earlier run')}`);
  });
  if (!overlay.remotes.length) {
    console.log(
      chalk.dim('  no remotes redirected (pass --port to point this app at your dev server)'),
    );
  }
  if (argv.shell === 'dev') {
    console.log(`  ${chalk.dim('shell')} ${chalk.dim('->')} development bundle`);
  }

  // Nothing is applied until a browser confirms: the cookie has to land in the user
  // agent that will load the shell, and this one is a terminal.
  console.log(chalk.bold('\nOpen this in your browser to apply it:'));
  console.log(`  ${chalk.cyan(confirmUrl)}\n`);
  console.log(
    chalk.dim(
      `Expires ${new Date(overlay.expiresAt).toLocaleString()} \u00b7 stop with: appshell dev stop ${overlay.id}`,
    ),
  );

  if (argv.open) {
    launch(confirmUrl);
  }
};

/** `default/sample-mfe-pong@0.0.1` -> `0.0.1` */
const activatedVersion = (appId?: string) => appId?.split('@').pop();

const reportWorkspace = (
  apps: WorkspaceApp[],
  environmentApps: Record<string, { appId: string }>,
  overlays: OpenOverlay[],
  scopeId: string,
) => {
  const width = Math.max(...apps.map((app) => app.name.length));

  apps.forEach((app) => {
    const activated = activatedVersion(environmentApps[`${scopeId}/${app.name}`]?.appId);
    const owned = new Set(app.remotes);
    const redirecting = overlays.filter((overlay) => overlay.remotes.some((key) => owned.has(key)));

    // A local version ahead of what is activated is the usual reason an edit seems to
    // have no effect, so it is called out rather than left to be inferred.
    const describeState = () => {
      if (!activated) return chalk.yellow('not activated');
      if (activated === app.version) return chalk.dim(`activated ${activated}`);

      return chalk.yellow(`activated ${activated}, local ${app.version}`);
    };

    const state = describeState();

    const overlaid = redirecting.length
      ? `  ${chalk.cyan(`overlay ${redirecting[0].id.slice(0, 8)}`)} ${chalk.dim(
          `(${redirecting[0].remotes.filter((key) => owned.has(key)).length} of its remotes)`,
        )}`
      : '';

    console.log(`  ${app.name.padEnd(width)}  ${state}${overlaid}`);
  });
};

export const status = async (argv: DevArgs) => {
  const { scopeId, name } = target(argv);
  const client = new RegistryClient(argv.registry);
  const [overlays, environment] = await Promise.all([
    client.listOverlays(scopeId, name),
    client.getEnvironment(scopeId, name),
  ]);

  const workspace = findWorkspace(process.cwd());

  if (workspace?.apps.length) {
    console.log(
      chalk.bold(`\n${workspace.root}`) +
        chalk.dim(` \u00b7 ${workspace.apps.length} apps \u00b7 ${scopeId}/${name}\n`),
    );
    reportWorkspace(workspace.apps, environment.apps ?? {}, overlays, scopeId);
  }

  if (!overlays.length) {
    console.log(`\nNo overlays open on ${scopeId}/${name}.`);
    return;
  }

  console.log(chalk.bold(`\nOverlays open on ${scopeId}/${name}\n`));
  overlays.forEach((overlay) => {
    console.log(`  ${chalk.cyan(overlay.id)}  ${describeOverlay(overlay)}`);
    overlay.remotes.forEach((key) => console.log(`    ${chalk.dim(key)}`));
    console.log(
      chalk.dim(
        `    opened by ${overlay.owner} \u00b7 expires ${new Date(overlay.expiresAt).toLocaleString()}`,
      ),
    );
    console.log(chalk.dim(`    apply: ${client.baseUrl}${overlay.confirmUrl}`));
  });

  // An overlay only takes effect in a browser that confirmed it, so what is listed
  // here is what could be in play, not what any particular tab is actually running.
  console.log(
    chalk.dim(
      '\nListed overlays are open on the registry; each only applies to a browser that confirmed it.',
    ),
  );
};

export const stop = async (argv: DevArgs) => {
  const { scopeId, name } = target(argv);
  const client = new RegistryClient(argv.registry);

  if (!argv.id && !argv.all) {
    throw new Error("Pass an overlay id, or --all to stop every overlay on this environment.");
  }

  const ids = argv.id
    ? [argv.id]
    : (await client.listOverlays(scopeId, name)).map((overlay) => overlay.id);

  if (!ids.length) {
    console.log(`No overlays open on ${scopeId}/${name}.`);
    return;
  }

  const results = await Promise.all(
    ids.map(async (id) => ({ id, ...(await client.closeOverlay(scopeId, name, id)) })),
  );

  results.forEach(({ id, revoked }) =>
    console.log(
      revoked
        ? chalk.green(`Stopped overlay ${id}.`)
        : chalk.yellow(`No overlay ${id} to stop; it may have already expired.`),
    ),
  );

  console.log(
    chalk.dim('A browser holding a stopped overlay reverts on its next load of the environment.'),
  );
};

export default start;
