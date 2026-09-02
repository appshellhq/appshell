/* eslint-disable no-console */
import chalk from 'chalk';
import { spawn } from 'child_process';
import { GlobalArgs } from '../util/args';
import { DevHint, readDevHint, verifyDevHint } from '../util/devHint';
import { identify } from '../util/identity';
import {
  CreateOverlayBody,
  OpenOverlay,
  OverlayRemoteBody,
  parseApplication,
  RegistryClient,
} from '../util/registry';
import { findWorkspace, WorkspacePackage } from '../util/workspace';

/*
 * `T | undefined` rather than `T?` throughout: an option yargs declares is always present
 * on the parsed object, holding undefined when it was not passed. Writing it as optional
 * describes a different shape from the one the builder actually produces, which is the
 * mismatch that used to be papered over with a cast.
 */
export type DevStartArgs = GlobalArgs & {
  theme: string | undefined;
  package: string | undefined;
  url: string | undefined;
  port: number | undefined;
  remote: string[] | undefined;
  shell: 'prod' | 'dev';
  open: boolean;
};

export type DevStopArgs = GlobalArgs & {
  id: string | undefined;
  package: string | undefined;
  all: boolean;
};

/** `status` takes nothing of its own. */
export type DevStatusArgs = GlobalArgs;

const target = (argv: GlobalArgs) => {
  if (!argv.application) {
    throw new Error(
      "No application given. Pass --application or set one with 'appshell config set application <name>'.",
    );
  }

  return parseApplication(argv.application, argv.scopeId);
};

/**
 * Where this package is running locally. A port is what a developer actually knows, so it
 * is the ergonomic form; `--url` covers everything else, such as a devbox or Codespace
 * that is not on localhost.
 *
 * Deliberately not inferred from the package's own config. `${SOME_APP_URL}` resolves to
 * wherever the loaded build context says the package is served from, which is not the same
 * question — with a staging env file loaded it would resolve to the deployed URL and
 * mint an overlay that redirects a package to where it already points, silently doing
 * nothing in exactly the case this feature exists for.
 */
const localOrigin = (argv: DevStartArgs): string | undefined => {
  if (argv.url) return argv.url;

  return argv.port ? `http://localhost:${argv.port}` : undefined;
};

/**
 * Swaps in the origin the dev server is actually listening on, keeping the path the
 * manifest already describes. A published pkg usually points at a CDN, and the whole
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
 * The origin to redirect to, taken from the hint the plugin leaves in `dist/`.
 *
 * The hint is used unless the probe *disproves* it. Failing to confirm it is not a
 * disproof — a dev server that has not been started yet looks exactly the same from here,
 * and opening the overlay first is a normal thing to do. A wrong overlay is visible on the
 * page and revertible with `appshell dev stop`; an overlay that quietly redirects nothing
 * is neither, which is why that used to cost people an afternoon.
 *
 * A port serving another package's remotes is the one case that is genuinely disproved,
 * and it is refused rather than warned about, because redirecting at somebody else's
 * bundle is the wrong answer rather than an unconfirmed one.
 */
export const hintedOrigin = async (
  hint: DevHint,
  keys: string[],
  label: string,
): Promise<string> => {
  const check = await verifyDevHint(hint, keys);

  if (check.verdict === 'displaced') {
    throw new Error(
      `${hint.origin} is serving ${check.serving.join(', ')}, not ${label}. That dev-server ` +
        `hint is left over from another run. Pass --port to say where ${label} is running.`,
    );
  }

  if (check.verdict === 'serving') {
    console.log(chalk.dim(`Found ${label} serving at ${hint.origin}`));
  } else {
    console.log(chalk.yellow(`Could not confirm a dev server: ${check.reason}.`));
    console.log(
      chalk.yellow(
        `Redirecting to ${hint.origin} anyway. Start it, or pass --port if it is elsewhere.`,
      ),
    );
  }

  return hint.origin;
};

/**
 * The overlay redirects exactly the remotes this package has published into the target
 * application, asked of the registry rather than read out of a local build. The
 * registry is the only thing that knows what is actually activated there, and it
 * answers without this package having been built in the current working tree at all.
 */
const remotesOf = async (
  argv: DevStartArgs,
  client: RegistryClient,
  scopeId: string,
): Promise<Record<string, OverlayRemoteBody>> => {
  // An explicit port or url always wins, and is never probed: a flag is stated intent,
  // where a hint is a guess. It also covers the devbox or Codespace where the browser
  // reaches this package somewhere other than where it binds, which no probe can know.
  const source = localOrigin(argv) ?? readDevHint(process.cwd());

  // Nothing to point at and nothing to ask: the overlay still carries the shell flavor
  // and theme, which are the halves that matter where the application already resolves
  // to localhost.
  if (!source) return {};

  const pkg = argv.package ?? identify(process.cwd()).name;
  const { remotes } = await client.packageManifest(scopeId, pkg);

  if (!remotes || !Object.keys(remotes).length) {
    throw new Error(`${scopeId}/${pkg} publishes no remotes.`);
  }

  const wanted = argv.remote?.length ? new Set(argv.remote) : undefined;
  const missing = [...(wanted ?? [])].filter((key) => !remotes[key]);

  if (missing.length) {
    throw new Error(`${scopeId}/${pkg} does not publish ${missing.join(', ')}.`);
  }

  const selected = Object.entries(remotes).filter(([key]) => !wanted || wanted.has(key));
  const origin =
    typeof source === 'string'
      ? source
      : await hintedOrigin(
          source,
          selected.map(([key]) => key),
          `${scopeId}/${pkg}`,
        );

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

/**
 * Reads `--theme` as either a published ref or a `base-accent` pair.
 *
 * `midnight-ember` is the pair; `acme/brand@1.0.0` is a ref. A ref always contains a
 * slash, which a pair never does, so they are told apart without a second flag. The
 * registry pins whichever form arrives and refuses one it cannot resolve.
 */
export const themeInput = (value: string) => {
  if (value.includes('/')) {
    return { ref: value };
  }

  const [base, accent] = value.split('-');

  if (!base || !accent) {
    throw new Error(
      `'${value}' is not a theme. Use 'base-accent', such as 'midnight-ember', or a published ` +
        `ref such as 'acme/brand@1.0.0'.`,
    );
  }

  return { base, accent };
};

const describeOverlay = (overlay: OpenOverlay) =>
  [
    overlay.shellFlavor === 'dev' && 'development shell',
    overlay.remotes.length && `${overlay.remotes.length} redirected`,
    // Otherwise a theme-only overlay reports "no changes" while having changed what the
    // entire page looks like.
    overlay.theme && `theme ${overlay.theme}`,
  ]
    .filter(Boolean)
    .join(', ') || 'no changes';

export const start = async (argv: DevStartArgs) => {
  const { scopeId, name } = target(argv);
  const client = new RegistryClient(argv.registry);
  const remotes = await remotesOf(argv, client, scopeId);
  const body: CreateOverlayBody = {
    remotes,
    shellFlavor: argv.shell,
    ...(argv.theme ? { theme: themeInput(argv.theme) } : {}),
  };
  // A confirmation page for an overlay that changes nothing is worse than an error,
  // because it looks like it worked. Refusing here is what makes the page below always
  // worth opening.
  if (!Object.keys(remotes).length && argv.shell !== 'dev' && !argv.theme) {
    throw new Error(
      `Nothing to overlay on ${scopeId}/${name}. Pass --port to redirect this package at ` +
        `your dev server, --shell dev for the development bundle, or --theme to try a theme.`,
    );
  }

  const overlay = await client.createOverlay(scopeId, name, body);
  const confirmUrl = `${client.baseUrl}${overlay.confirmUrl}`;

  // The registry keeps one overlay per developer per application, so this may have
  // extended an existing one; report what is in effect now, not just what was sent.
  const carried = overlay.remotes.filter((key) => !remotes[key]);

  console.log(
    chalk.green(`\nOverlay ${carried.length ? 'extended' : 'opened'} on ${scopeId}/${name}`),
  );
  Object.entries(remotes).forEach(([key, remote]) => {
    console.log(`  ${key} ${chalk.dim('->')} ${remote.remoteEntryUrl}`);
  });
  carried.forEach((key) => {
    console.log(`  ${key} ${chalk.dim('-> still redirected from an earlier run')}`);
  });
  if (!overlay.remotes.length) {
    console.log(
      chalk.dim('  no remotes redirected (pass --port to point this package at your dev server)'),
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
      `Expires ${new Date(
        overlay.expiresAt,
      ).toLocaleString()} \u00b7 stop with: appshell dev stop ${overlay.id}`,
    ),
  );

  if (argv.open) {
    launch(confirmUrl);
  }
};

/** `default/sample-mfe-pong@0.0.1` -> `0.0.1` */
const activatedVersion = (packageId?: string) => packageId?.split('@').pop();

const reportWorkspace = (
  packages: WorkspacePackage[],
  applicationPackages: Record<string, { packageId: string }>,
  overlays: OpenOverlay[],
  scopeId: string,
) => {
  const width = Math.max(...packages.map((pkg) => pkg.name.length));

  packages.forEach((pkg) => {
    const activated = activatedVersion(applicationPackages[`${scopeId}/${pkg.name}`]?.packageId);
    const owned = new Set(pkg.remotes);
    const redirecting = overlays.filter((overlay) => overlay.remotes.some((key) => owned.has(key)));

    // A local version ahead of what is activated is the usual reason an edit seems to
    // have no effect, so it is called out rather than left to be inferred.
    const describeState = () => {
      if (!activated) return chalk.yellow('not activated');
      if (activated === pkg.version) return chalk.dim(`activated ${activated}`);

      return chalk.yellow(`activated ${activated}, local ${pkg.version}`);
    };

    const state = describeState();

    const overlaid = redirecting.length
      ? `  ${chalk.cyan(`overlay ${redirecting[0].id.slice(0, 8)}`)} ${chalk.dim(
          `(${redirecting[0].remotes.filter((key) => owned.has(key)).length} of its remotes)`,
        )}`
      : '';

    console.log(`  ${pkg.name.padEnd(width)}  ${state}${overlaid}`);
  });
};

/**
 * Which pkg publishes each redirected remote, asked of the registry so this works
 * outside a workspace too. Without it a developer reads `PongModule/Pong` off the
 * listing and still has to work out which package to name to stop it.
 */
const appsByRemoteKey = async (
  client: RegistryClient,
  scopeId: string,
  packages: string[],
): Promise<Record<string, string>> => {
  const manifests = await Promise.all(
    packages.map(async (pkg) => {
      try {
        return [pkg, await client.packageManifest(scopeId, pkg)] as const;
      } catch {
        // An pkg can be activated and then unpublished; the rest of the listing is
        // still worth printing.
        return [pkg, undefined] as const;
      }
    }),
  );

  return manifests.reduce<Record<string, string>>((acc, [pkg, manifest]) => {
    Object.keys(manifest?.remotes ?? {}).forEach((key) => {
      acc[key] = pkg;
    });

    return acc;
  }, {});
};

const groupByPackage = (remotes: string[], owners: Record<string, string>) =>
  remotes.reduce<Record<string, string[]>>((acc, key) => {
    const pkg = owners[key] ?? 'unknown package';

    return { ...acc, [pkg]: [...(acc[pkg] ?? []), key] };
  }, {});

export const status = async (argv: DevStatusArgs) => {
  const { scopeId, name } = target(argv);
  const client = new RegistryClient(argv.registry);
  const [overlays, application] = await Promise.all([
    client.listOverlays(scopeId, name),
    client.getApplication(scopeId, name),
  ]);

  const activated = Object.keys(application.packages ?? {}).map(
    (id) => id.split('/').pop() as string,
  );
  const workspace = findWorkspace(process.cwd());

  if (workspace?.packages.length) {
    console.log(
      chalk.bold(`\n${workspace.root}`) +
        chalk.dim(` \u00b7 ${workspace.packages.length} packages \u00b7 ${scopeId}/${name}\n`),
    );
    reportWorkspace(workspace.packages, application.packages ?? {}, overlays, scopeId);
  }

  if (!overlays.length) {
    console.log(`\nNo overlays open on ${scopeId}/${name}.`);
    return;
  }

  const owners = await appsByRemoteKey(client, scopeId, activated);

  console.log(chalk.bold(`\nOverlays open on ${scopeId}/${name}\n`));
  overlays.forEach((overlay) => {
    console.log(`  ${chalk.cyan(overlay.id)}  ${describeOverlay(overlay)}`);

    Object.entries(groupByPackage(overlay.remotes, owners)).forEach(([pkg, keys]) => {
      console.log(`    ${pkg} ${chalk.dim(keys.join(', '))}`);
      console.log(chalk.dim(`      stop:  appshell dev stop --pkg ${pkg}`));
    });

    console.log(
      chalk.dim(
        `    opened by ${overlay.owner} \u00b7 expires ${new Date(
          overlay.expiresAt,
        ).toLocaleString()}`,
      ),
    );
    console.log(chalk.dim(`    apply: ${client.baseUrl}${overlay.confirmUrl}`));
    console.log(chalk.dim(`    close: appshell dev stop ${overlay.id}`));
  });

  // An overlay only takes effect in a browser that confirmed it, so what is listed
  // here is what could be in play, not what any particular tab is actually running.
  console.log(
    chalk.dim(
      '\nListed overlays are open on the registry; each only applies to a browser that confirmed it.',
    ),
  );
};

/**
 * Which overlay carries this package's redirects. There is one per developer, so in
 * practice this is unambiguous; when it is not, the caller is asked to name one rather
 * than have an arbitrary developer's overlay edited on their behalf.
 */
const overlayRedirecting = async (
  argv: DevStopArgs,
  client: RegistryClient,
  scopeId: string,
  name: string,
  pkg: string,
): Promise<{ id: string; keys: string[] }> => {
  const { remotes } = await client.packageManifest(scopeId, pkg);
  const owned = Object.keys(remotes ?? {});
  const open = await client.listOverlays(scopeId, name);
  const candidates = argv.id
    ? open.filter((overlay) => overlay.id === argv.id)
    : open.filter((overlay) => overlay.remotes.some((key) => owned.includes(key)));

  if (!candidates.length) {
    throw new Error(`No open overlay on ${scopeId}/${name} is redirecting ${pkg}.`);
  }

  if (candidates.length > 1) {
    throw new Error(
      `More than one overlay is redirecting ${pkg}. Name one: ${candidates
        .map((overlay) => `appshell dev stop ${overlay.id} --pkg ${pkg}`)
        .join(', ')}`,
    );
  }

  return { id: candidates[0].id, keys: owned };
};

export const stop = async (argv: DevStopArgs) => {
  const { scopeId, name } = target(argv);
  const client = new RegistryClient(argv.registry);

  // Stepping away from one micro-frontend should not revert every other one.
  if (argv.package !== undefined) {
    const pkg = argv.package || identify(process.cwd()).name;
    const { id, keys } = await overlayRedirecting(argv, client, scopeId, name, pkg);
    const { remotes } = await client.stopRedirecting(scopeId, name, id, keys);

    console.log(chalk.green(`Stopped redirecting ${pkg}.`));
    console.log(
      remotes.length
        ? chalk.dim(`  still redirected: ${remotes.join(', ')}`)
        : chalk.dim('  nothing redirected now; the overlay still selects the shell bundle'),
    );

    return;
  }

  if (!argv.id && !argv.all) {
    throw new Error(
      'Pass an overlay id, --package to stop just one package, or --all to stop every overlay on this application.',
    );
  }

  const ids = argv.id
    ? [argv.id]
    : (await client.listOverlays(scopeId, name)).map((overlay) => overlay.id);

  if (!ids.length) {
    console.log(`No overlays open on ${scopeId}/${name}.`);
    return;
  }

  const results = await Promise.all(
    // `id` last: the response echoes it, but the one that was asked about is what the
    // message should name.
    ids.map(async (id) => ({ ...(await client.closeOverlay(scopeId, name, id)), id })),
  );

  results.forEach(({ id, revoked }) =>
    console.log(
      revoked
        ? chalk.green(`Stopped overlay ${id}.`)
        : chalk.yellow(`No overlay ${id} to stop; it may have already expired.`),
    ),
  );

  console.log(
    chalk.dim('A browser holding a stopped overlay reverts on its next load of the application.'),
  );
};

export default start;
