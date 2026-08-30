#!/usr/bin/env node

/* eslint-disable no-console */

/**
 * @appshell/cli package API
 */
import os from 'os';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { readConfig } from '../../config/src/utils/config';
// yargs derives --version by walking up for a package.json, which does not exist beside
// a bundled CLI — so it reported 'unknown'. webpack inlines this at build time.
import { version as cliVersion } from '../package.json';
import * as app from './handlers/app';
import initConfigHandler, { InitArgs } from './handlers/config/init';
import listConfigHandler, { ListConfigArgs } from './handlers/config/list';
import setConfigHandler, { SetConfigArgs } from './handlers/config/set';
import * as dev from './handlers/dev';
import { DevStartArgs, DevStatusArgs, DevStopArgs } from './handlers/dev';
import generateManifestHandler, { GenerateManifestArgs } from './handlers/generate.manifest';
import loginHandler, { LoginArgs, logout } from './handlers/login';
import outdatedHandler, { OutdatedArgs } from './handlers/outdated';
import publishHandler from './handlers/publish';
import * as theme from './handlers/theme';
import { ThemeGetArgs, ThemeInitArgs, ThemeListArgs, ThemePublishArgs } from './handlers/theme';
import { GlobalArgs } from './util/args';

const loadConfig = (cPath: string) => {
  const originalDebug = console.debug;

  console.debug = () => {};
  const c = readConfig(cPath);
  console.debug = originalDebug;

  return c;
};
const configPath = process.env.APPSHELL_CONFIG || path.join(os.homedir(), '.appshell', 'config');
const config = loadConfig(configPath);

/*
 * Each subcommand is declared with the args it actually accepts, rather than all three
 * sharing one wide union. That is what lets yargs infer a matching shape: a builder
 * starting from `Argv<GlobalArgs>` and adding this command's options ends up at exactly
 * the type its handler takes, so nothing has to be asserted.
 */
const devStartCommand: yargs.CommandModule<GlobalArgs, DevStartArgs> = {
  // `$0` keeps bare `appshell dev` working; starting is the common case.
  command: ['start', '$0'],
  describe: 'Open an overlay and print the url that applies it',
  // eslint-disable-next-line @typescript-eslint/no-shadow
  builder: (yargs) =>
    yargs
      .option('port', {
        type: 'number',
        description: 'Port this package is running on locally, as http://localhost:<port>',
      })
      .option('url', {
        type: 'string',
        description: 'Full origin this package is served from, when it is not localhost',
      })
      .conflicts('port', 'url')
      .option('package', {
        type: 'string',
        description:
          'Package whose remotes to redirect. Defaults to the package.json in this directory',
      })
      .option('remote', {
        type: 'array',
        string: true,
        description:
          'Redirect only these remote keys. Defaults to every remote the package publishes',
      })
      .option('shell', {
        choices: ['prod', 'dev'] as const,
        default: 'dev' as const,
        description:
          'Shell bundle to serve. The development build is what supports hot reloading remotes in place',
      })
      .option('open', {
        boolean: true,
        default: true,
        description: 'Open the confirmation page in a browser',
      }),
  handler: dev.start,
};

const devStatusCommand: yargs.CommandModule<GlobalArgs, DevStatusArgs> = {
  command: 'status',
  describe: 'List the overlays currently open on the application',
  handler: dev.status,
};

const devStopCommand: yargs.CommandModule<GlobalArgs, DevStopArgs> = {
  command: 'stop [id]',
  describe: 'Close an overlay, reverting the application for anyone holding it',
  // eslint-disable-next-line @typescript-eslint/no-shadow
  builder: (yargs) =>
    yargs
      .positional('id', { type: 'string', description: 'Overlay to close' })
      .option('package', {
        type: 'string',
        description:
          'Stop redirecting just this package, leaving the rest of the overlay in place. Defaults to the package.json in this directory',
      })
      .option('all', {
        boolean: true,
        default: false,
        description: 'Close every overlay open on this application',
      }),
  handler: dev.stop,
};

/*
 * `GlobalArgs` on both sides: registry, application and scopeId are declared with
 * `global: true` on the root parser before any command attaches, so by the time this
 * builder runs they are genuinely present — the type is describing what is there rather
 * than asserting it.
 */
const devCommand: yargs.CommandModule<GlobalArgs, GlobalArgs> = {
  command: 'dev',
  describe: 'Point an application at this package running locally, for this browser only',
  // eslint-disable-next-line @typescript-eslint/no-shadow
  builder: (yargs) =>
    yargs.command(devStartCommand).command(devStatusCommand).command(devStopCommand),
  handler: () => undefined,
};

const generateManifestCommand: yargs.CommandModule<unknown, GenerateManifestArgs> = {
  command: 'manifest',
  describe: 'Generate the appshell manifest by processing the template specified by --template',
  // eslint-disable-next-line @typescript-eslint/no-shadow
  builder: (yargs) =>
    yargs
      .option('template', {
        alias: 't',
        default: 'appshell.template.json',
        type: 'string',
        description: 'Path to the appshell config template to process',
      })
      .option('outDir', {
        alias: 'o',
        default: 'dist',
        requiresArg: true,
        type: 'string',
        description: 'Output location for the appshell manifest',
      })
      .option('outFile', {
        alias: 'f',
        default: 'appshell.manifest.json',
        type: 'string',
        description: 'Output filename for the appshell manifest',
      }),
  handler: generateManifestHandler,
};

const outdatedCommand: yargs.CommandModule<unknown, OutdatedArgs> = {
  command: 'outdated',
  aliases: ['o'],
  describe: 'Analyzes shared dependencies for outdated versions',
  // eslint-disable-next-line @typescript-eslint/no-shadow
  builder: (yargs) =>
    yargs
      .option('registry', {
        description: 'Registry against which the package is compared',
      })
      .option('workingDir', {
        alias: 'd',
        default: '.',
        description: 'Working directory to analyze shared dependencies',
      })
      .option('manager', {
        alias: 'm',
        default: 'npm',
        type: 'string',
        choices: ['npm', 'yarn'],
        description: 'Package manager to use for dependency resolution',
      }) as yargs.Argv<OutdatedArgs>,
  handler: outdatedHandler,
};

const initConfigCommand: yargs.CommandModule<unknown, InitArgs> = {
  command: 'init',
  aliases: ['i'],
  describe: 'Initialize the configuration',
  // eslint-disable-next-line @typescript-eslint/no-shadow
  builder: (yargs) =>
    yargs.option('config', {
      alias: 'c',
      describe: 'Path to the cli config file',
      default: configPath,
      type: 'string',
    }) as yargs.Argv<InitArgs>,
  handler: initConfigHandler,
};

const listConfigCommand: yargs.CommandModule<unknown, ListConfigArgs> = {
  command: 'list',
  aliases: ['ls'],
  describe: 'Print the current cli configuration',
  // eslint-disable-next-line @typescript-eslint/no-shadow
  builder: (yargs) =>
    yargs.option('config', {
      alias: 'c',
      describe: 'Path to the cli config file',
      default: configPath,
      type: 'string',
    }) as yargs.Argv<ListConfigArgs>,
  handler: listConfigHandler,
};

const setConfigCommand: yargs.CommandModule<unknown, SetConfigArgs> = {
  command: 'set <key> <value>',
  describe: 'Set a value in the cli configuration',
  // eslint-disable-next-line @typescript-eslint/no-shadow
  builder: (yargs) =>
    yargs
      .positional('key', { type: 'string', demandOption: true })
      .positional('value', { type: 'string', demandOption: true })
      .option('config', {
        alias: 'c',
        describe: 'Path to the cli config file',
        default: configPath,
        type: 'string',
      }) as yargs.Argv<SetConfigArgs>,
  handler: setConfigHandler,
};

const loginCommand: yargs.CommandModule<unknown, LoginArgs> = {
  command: 'login',
  describe: 'Authenticate with an appshell registry',
  // eslint-disable-next-line @typescript-eslint/no-shadow
  builder: (yargs) =>
    yargs
      .option('authIssuer', {
        default: process.env.APPSHELL_AUTH_ISSUER || config.authIssuer || '',
        type: 'string',
        description: 'OIDC issuer url used to obtain a token',
      })
      .option('clientId', {
        default: process.env.APPSHELL_CLIENT_ID || config.clientId || 'appshell-cli',
        type: 'string',
        description: 'OIDC client id',
      })
      .option('clientSecret', {
        // Only read from the application so the secret never lands in shell history.
        default: process.env.APPSHELL_CLIENT_SECRET,
        type: 'string',
        description:
          'OIDC client secret. Switches to the client credentials grant for CI. Prefer APPSHELL_CLIENT_SECRET',
      })
      .option('scope', {
        default: 'openid profile',
        type: 'string',
        description: 'OIDC scopes to request',
      }) as yargs.Argv<LoginArgs>,
  handler: loginHandler,
};

const logoutCommand: yargs.CommandModule<unknown, { registry: string }> = {
  command: 'logout',
  describe: 'Discard the stored credential for a registry',
  handler: logout,
};

/*
 * The builder's type names the flag as it is written — `package-version` — while the
 * handler reads `packageVersion`. Both are correct: yargs supplies the camel-cased form
 * to handlers, which is what `ArgumentsCamelCase` describes. Declaring the option type
 * literally is what lets the two line up without an assertion.
 */
type PublishOptions = GlobalArgs & {
  template: string;
  name?: string;
  'package-version'?: string;
  visibility?: 'public' | 'private';
  watch: boolean;
  force: boolean;
};

const publishCommand: yargs.CommandModule<GlobalArgs, PublishOptions> = {
  command: 'publish',
  describe: 'Publish a package to the appshell registry',
  // eslint-disable-next-line @typescript-eslint/no-shadow
  builder: (yargs) =>
    yargs
      .option('template', {
        alias: 't',
        default: 'appshell.template.json',
        type: 'string',
        description: 'Path to the appshell config template to process',
      })
      .option('name', {
        type: 'string',
        description: 'Package name. Defaults to the unscoped package.json name',
      })
      // Not `version`: yargs reserves that word for its own flag, so the value never
      // reaches the handler and the package silently publishes at its package.json version.
      .option('package-version', {
        type: 'string',
        description: 'Package version to publish as. Defaults to the package.json version',
      })
      .option('visibility', {
        type: 'string',
        choices: ['public', 'private'] as const,
        description: 'Visibility of the published version',
      })
      .option('watch', {
        alias: 'w',
        boolean: true,
        default: false,
        type: 'boolean',
        description: 'Republish whenever the template changes',
      })
      // Whether force is permitted is the registry's call, not this flag's: it is on by
      // default only for a registry running without auth, and a real one refuses unless
      // ALLOW_FORCE_PUBLISH says otherwise. Sending it has always been supported end to
      // end — there was simply no way to ask for it from here.
      .option('force', {
        boolean: true,
        default: false,
        type: 'boolean',
        description: 'Republish over an existing version whose content differs',
      }),
  handler: publishHandler,
};

const unpublishCommand: yargs.CommandModule<
  unknown,
  { registry: string; scopeId: string; name: string; version: string }
> = {
  command: 'unpublish <name> <version>',
  describe: 'Remove a published package version from the appshell registry',
  // eslint-disable-next-line @typescript-eslint/no-shadow
  builder: (yargs) =>
    yargs
      // `version` is yargs' own reserved flag. Left alone it wins over this positional
      // and the handler unpublishes `<name>@false` — so turn the built-in off for this
      // command, where a bare `--version` would be meaningless anyway. `appshell
      // --version` is unaffected; the top-level parser still has it.
      .version(false)
      .positional('name', { type: 'string', demandOption: true })
      .positional('version', { type: 'string', demandOption: true }) as yargs.Argv<{
      registry: string;
      scopeId: string;
      name: string;
      version: string;
    }>,
  handler: async (argv) => {
    const { RegistryClient } = await import('./util/registry');
    await new RegistryClient(argv.registry).unpublish(argv.scopeId, argv.name, argv.version);
    console.log(`Unpublished ${argv.scopeId}/${argv.name}@${argv.version}`);
  },
};

yargs(hideBin(process.argv))
  .option('apiKey', {
    alias: 'k',
    default: process.env.APPSHELL_API_KEY || config.apiKey || '',
    type: 'string',
    description: 'Api key to use for appshell registry',
    global: true,
  })
  .option('apiKeyHeader', {
    default: process.env.APPSHELL_API_KEY_HEADER || config.apiKeyHeader || 'x-api-key',
    type: 'string',
    description: 'Header to send the registry api key in',
    global: true,
  })
  .option('registry', {
    alias: 'r',
    describe: 'Appshell registry to operate against',
    default: process.env.APPSHELL_REGISTRY || config.registry || 'http://localhost:7150',
    type: 'string',
    global: true,
  })
  .option('application', {
    alias: 'a',
    describe: "Application to operate against, as 'name' or 'scope/name'",
    default: process.env.APPSHELL_APPLICATION || config.application,
    type: 'string',
    global: true,
  })
  .option('scopeId', {
    describe: 'Scope that owns unqualified packages and applications',
    default: process.env.APPSHELL_SCOPE_ID || config.scopeId || 'default',
    type: 'string',
    global: true,
  })
  .option('verbose', {
    alias: 'v',
    boolean: true,
    default: false,
    type: 'boolean',
    description: 'Verbose output',
    global: true,
  })
  .middleware((argv) => {
    if (!argv.verbose) {
      // eslint-disable-next-line no-console
      console.debug = () => {};
    }
  })
  .command({
    command: 'generate [target]',
    describe: 'Generates a resource',
    handler: () => {},
    // eslint-disable-next-line @typescript-eslint/no-shadow
    builder: (yargs) => yargs.command(generateManifestCommand).demandCommand(),
  })
  .command({
    command: 'config [target]',
    describe: 'Configures the appshell cli',
    handler: () => {},
    // eslint-disable-next-line @typescript-eslint/no-shadow
    builder: (yargs) =>
      yargs
        .command(initConfigCommand)
        .command(listConfigCommand)
        .command(setConfigCommand)
        .demandCommand(),
  })
  .command({
    command: 'theme <target>',
    describe: 'Publish and browse themes in the appshell registry',
    handler: () => {},
    // eslint-disable-next-line @typescript-eslint/no-shadow
    builder: (yargs) =>
      yargs
        .command<ThemeListArgs>({
          command: 'list',
          describe: 'List themes this scope may use: its own, plus every public one',
          // eslint-disable-next-line @typescript-eslint/no-shadow
          builder: (yargs) =>
            yargs.option('scope', {
              type: 'string',
              description: 'List another scope instead of the configured one',
            }),
          handler: theme.list,
        })
        .command<ThemeGetArgs>({
          command: 'get <ref>',
          describe: "Read a theme, values included. 'name', 'scope/name' or 'scope/name@version'",
          // eslint-disable-next-line @typescript-eslint/no-shadow
          builder: (yargs) => yargs.positional('ref', { type: 'string', demandOption: true }),
          handler: theme.get,
        })
        .command<ThemeInitArgs>({
          command: 'init',
          describe: 'Fork a published theme into a file to edit',
          // eslint-disable-next-line @typescript-eslint/no-shadow
          builder: (yargs) =>
            yargs
              .option('from', {
                type: 'string',
                demandOption: true,
                description: "Theme to fork, as 'scope/name@version'",
              })
              .option('name', {
                type: 'string',
                description: "Name for the new theme. Defaults to '<source>-fork'",
              })
              .option('out', {
                alias: 'o',
                type: 'string',
                description: 'Write to this file instead of stdout',
              }),
          handler: theme.init,
        })
        .command<ThemePublishArgs>({
          command: 'publish',
          describe: 'Publish a theme from a file',
          // eslint-disable-next-line @typescript-eslint/no-shadow
          builder: (yargs) =>
            yargs.option('file', {
              alias: 'f',
              type: 'string',
              demandOption: true,
              description: 'Path to the theme resource to publish',
            }),
          handler: theme.publish,
        })
        .demandCommand(),
  })
  .command({
    command: 'app <target>',
    describe: 'Manage appshell applications',
    handler: () => {},
    // eslint-disable-next-line @typescript-eslint/no-shadow
    builder: (yargs) =>
      yargs
        .command({
          command: 'apply',
          describe: 'Reconcile an application against a declared resource file',
          // eslint-disable-next-line @typescript-eslint/no-shadow
          builder: (yargs) =>
            yargs.option('file', {
              alias: 'f',
              type: 'string',
              demandOption: true,
              requiresArg: true,
              describe: 'Path to an application resource, as yaml or json',
            }),
          handler: app.apply as never,
        })
        .command({
          command: 'list',
          aliases: ['ls'],
          describe: 'List applications',
          // eslint-disable-next-line @typescript-eslint/no-shadow
          builder: (yargs) =>
            yargs.option('owner', { type: 'string', description: 'Filter by owner' }),
          handler: app.list as never,
        })
        .command({
          command: 'get [name]',
          describe: 'Show a single application',
          handler: app.get as never,
        })
        .command({
          command: 'create <name>',
          describe: 'Create an application',
          // eslint-disable-next-line @typescript-eslint/no-shadow
          builder: (yargs) =>
            yargs
              .positional('name', { type: 'string', demandOption: true })
              .option('ephemeral', { boolean: true, default: false, type: 'boolean' })
              .option('visibility', { type: 'string', choices: ['public', 'private'] as const })
              .option('shell-bundle-url', {
                type: 'string',
                describe: 'Shell bundle this application loads, instead of the registry default',
              }),
          handler: app.create as never,
        })
        .command({
          command: 'delete [name]',
          aliases: ['rm'],
          describe: 'Delete an application',
          handler: app.remove as never,
        })
        .command({
          command: 'deactivate <package>',
          describe: "Remove a package from an application, as 'name' or 'scope/name'",
          // eslint-disable-next-line @typescript-eslint/no-shadow
          builder: (yargs) => yargs.positional('package', { type: 'string', demandOption: true }),
          handler: app.deactivate as never,
        })
        .command({
          command: 'revisions [name]',
          describe: 'List an application revision history',
          // eslint-disable-next-line @typescript-eslint/no-shadow
          builder: (yargs) => yargs.option('limit', { type: 'number' }),
          handler: app.revisions as never,
        })
        .command({
          command: 'rollback [name]',
          describe: 'Roll an application back to a previous revision',
          // eslint-disable-next-line @typescript-eslint/no-shadow
          builder: (yargs) =>
            yargs.option('to', { type: 'number', demandOption: true, description: 'Revision' }),
          handler: app.rollback as never,
        })
        .command({
          command: 'composition [name]',
          describe: 'Print the resolved composition for an application',
          handler: app.composition as never,
        })
        .command({
          command: 'open [name]',
          describe: 'Print the shell url for an application',
          handler: app.open as never,
        })
        .command({
          command: 'sync',
          describe: 'Sync a target application from a source application',
          // eslint-disable-next-line @typescript-eslint/no-shadow
          builder: (yargs) =>
            yargs
              .option('from', {
                type: 'string',
                demandOption: true,
                description: "Source application as 'name' or 'scope/name'",
              })
              .option('to', {
                type: 'string',
                description:
                  "Target application as 'name' or 'scope/name'. Defaults to --application.",
              })
              .option('mode', {
                type: 'string',
                choices: ['replace', 'merge'] as const,
                default: 'replace',
                description: 'replace copies source fields verbatim, merge applies source values',
              })
              .option('include', {
                type: 'array',
                string: true,
                choices: [
                  'packages',
                  'shell',
                  'overrides',
                  'allowOverrides',
                  'sharedBaselines',
                  'sharedDepsEnforcement',
                  'visibility',
                ] as const,
                description: 'Optional list of application sections to sync',
              }),
          handler: app.sync as never,
        })
        .command({
          command: 'clone',
          describe: 'Create a new application by cloning a source application',
          // eslint-disable-next-line @typescript-eslint/no-shadow
          builder: (yargs) =>
            yargs
              .option('from', {
                type: 'string',
                demandOption: true,
                description: "Source application as 'name' or 'scope/name'",
              })
              .option('to', {
                type: 'string',
                description:
                  "Target application as 'name' or 'scope/name'. Defaults to --application.",
              })
              .option('visibility', {
                type: 'string',
                choices: ['public', 'private'] as const,
                description: 'Optional visibility override on the target application',
              })
              .option('ephemeral', {
                boolean: true,
                type: 'boolean',
                description: 'Optional ephemeral override on the target application',
              }),
          handler: app.clone as never,
        })
        .demandCommand(),
  })
  .command(devCommand)
  .command(loginCommand)
  .command(logoutCommand)
  .command(publishCommand)
  .command(unpublishCommand)
  .command(outdatedCommand)
  .version(cliVersion)
  .help()
  .alias('h', 'help')
  .fail((msg, err) => {
    if (err) {
      console.error(err.message);
    } else {
      console.error(msg);
    }
    console.error('You can use --help to see available options');
    process.exit(1);
  })
  .parse();
