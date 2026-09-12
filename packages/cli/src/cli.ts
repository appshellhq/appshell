/* eslint-disable no-console */

import os from 'os';
import path from 'path';
import yargs from 'yargs';
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
import {
  deprecate as packagesDeprecate,
  describe as packagesDescribe,
  get as packagesGet,
  list as packagesList,
} from './handlers/packages';
import publishHandler from './handlers/publish';
import * as theme from './handlers/theme';
import { ThemeGetArgs, ThemeInitArgs, ThemeListArgs, ThemePublishArgs } from './handlers/theme';
import { GlobalArgs } from './util/args';

// readConfig is quiet now, so there is nothing left to suppress here.
const loadConfig = (cPath: string) => readConfig(cPath);
const configPathOf = () =>
  process.env.APPSHELL_CONFIG || path.join(os.homedir(), '.appshell', 'config');

/*
 * Read when the parser is built, not when this module is imported. Option defaults close
 * over it and command builders run during parse, so both see whatever `buildCli` last
 * loaded — which is what lets a test point APPSHELL_CONFIG somewhere empty and get
 * defaults that do not depend on the machine it runs on.
 */
let config = loadConfig(configPathOf());

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
      .option('theme', {
        type: 'string',
        description:
          "Render with a different theme for this browser only, as 'base-accent' or a published ref",
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

/**
 * Reads over what the registry holds, shaped after npm and kubectl because both are
 * already in a developer's fingers.
 *
 * The listing marks which version each application has activated. That is the fact
 * `unpublish` needs and the one the cli could not previously answer — `unpublish` takes a
 * version and nothing here would tell you which versions existed, let alone which one was
 * load-bearing.
 */
const packagesCommand: yargs.CommandModule<GlobalArgs, GlobalArgs> = {
  command: 'packages',
  aliases: ['pkg'],
  describe: 'List and inspect packages in the appshell registry',
  // eslint-disable-next-line @typescript-eslint/no-shadow
  builder: (yargs) =>
    yargs
      .option('scope', {
        type: 'string',
        describe: 'List another scope instead of the configured one',
      })
      .command({
        command: 'list',
        aliases: ['ls', '$0'],
        describe: 'List published packages and which versions are activated',
        handler: packagesList as never,
      })
      .command({
        command: 'get <name>',
        describe: "Every published version of a package, as 'name' or 'scope/name'",
        handler: packagesGet as never,
      })
      .command({
        command: 'describe <name>',
        describe: "What a version exposes, as 'name', 'scope/name' or 'scope/name@version'",
        handler: packagesDescribe as never,
      })
      /*
       * The remedy for a version published in error. Unpublish refuses anything an
       * application has activated, so it only works on versions nobody uses — which is
       * not the case anyone needs a remedy for. This refuses new activations and leaves
       * existing ones resolving, so nothing running breaks while people move off it.
       */
      .command({
        command: 'deprecate <name> [reason..]',
        describe: "Mark a version as not to be adopted, as 'name@1.2.3'",
        builder: (y) =>
          y
            .positional('reason', {
              type: 'string',
              array: true,
              describe: 'Why, and what to use instead',
            })
            .option('undo', {
              type: 'boolean',
              default: false,
              describe: 'Lift an existing deprecation instead',
            }),
        handler: ((argv: { reason?: string[] }) =>
          packagesDeprecate({
            ...(argv as object),
            // Taken as words so a reason needs no quoting, which is the difference
            // between writing one and writing 'see docs'.
            reason: argv.reason?.join(' '),
          } as never)) as never,
      }),
  handler: () => undefined,
};

const generateManifestCommand: yargs.CommandModule<unknown, GenerateManifestArgs> = {
  command: 'manifest',
  describe: 'Generate the appshell manifest by processing the template specified by --template',
  // eslint-disable-next-line @typescript-eslint/no-shadow
  builder: (yargs) =>
    yargs
      // No default: the plugin emits the template into webpack's output directory, which
      // the cli cannot know, and a default leaves the handler unable to tell a path
      // someone supplied from one nobody chose. Absent, it is resolved by looking.
      .option('template', {
        alias: 't',
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
  // registry, application and scopeId arrive as global options; these two did not. They
  // still reached the handler — the CLI is strictCommands() rather than strict(), so
  // yargs passes an undeclared option through — but nothing advertised them, and
  // `config init --help` was the only place a caller would look.
  //
  // Deliberately without defaults: with one, yargs would always supply a value, the
  // handler's `?? existing` would never fire, and re-running init would silently wipe a
  // configured issuer.
  // eslint-disable-next-line @typescript-eslint/no-shadow
  builder: (yargs) =>
    yargs
      .option('config', {
        alias: 'c',
        describe: 'Path to the cli config file',
        default: configPathOf(),
        type: 'string',
      })
      // Declared here without defaults so they shadow the global options, whose defaults
      // would otherwise make argv always carry a value and init write it as though it had
      // been chosen — scopeId's global default is the literal 'default'.
      .option('scopeId', {
        describe: 'Scope that owns unqualified packages and applications',
        type: 'string',
      })
      .option('application', {
        describe: "Application to operate against, as 'name' or 'scope/name'",
        type: 'string',
      })
      .option('authIssuer', {
        describe: 'OIDC issuer the registry authenticates against',
        type: 'string',
      })
      .option('clientId', {
        describe: 'OIDC client the cli authenticates as',
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
      default: configPathOf(),
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
        default: configPathOf(),
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
        /*
         * `offline_access` is what makes staying logged in possible at all.
         *
         * Without it the refresh token is bound to the sso session, which this realm
         * idles out after 30 minutes — so a refresh only ever worked inside a stretch of
         * continuous use, which is when logging in again is least annoying. An offline
         * token outlives the session; Keycloak's default idle for one is 30 days.
         *
         * Every account here is granted the offline_access role through
         * default-roles-navaris, so asking for it costs nothing when it is not wanted.
         */
        default: 'openid profile offline_access',
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
  template?: string;
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
      // No default: the plugin emits the template into webpack's output directory, which
      // the cli cannot know, and a default leaves the handler unable to tell a path
      // someone supplied from one nobody chose. Absent, it is resolved by looking.
      .option('template', {
        alias: 't',
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

/**
 * The parser, with every command registered and nothing parsed.
 *
 * Separate from the entry point so the wiring can be exercised. `index.ts` used to call
 * `.parse()` at module load, which meant importing the commands ran the CLI — so nothing
 * could assert that a command passes the right arguments to its handler, and
 * `unpublish <name> <version>` shipped handing the handler `version: false`.
 *
 * Deliberately does not install `.fail()`. That handler calls `process.exit`, which a
 * caller driving the parser needs to supply for itself.
 */
export const buildCli = (args: string[]) => {
  config = loadConfig(configPathOf());

  return (
    yargs(args)
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
              describe:
                "Read a theme, values included. 'name', 'scope/name' or 'scope/name@version'",
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
                  .option('shell-bundle-url', {
                    type: 'string',
                    describe:
                      'Shell bundle this application loads, instead of the registry default',
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
              command: 'activate <package>',
              describe:
                "Activate a package, as 'scope/name@version', supplying any vars it declares",
              // eslint-disable-next-line @typescript-eslint/no-shadow
              builder: (yargs) =>
                yargs.positional('package', { type: 'string', demandOption: true }).option('set', {
                  type: 'array',
                  string: true,
                  description:
                    'Supply a var the package declares, as NAME=value. Repeatable. The scope ' +
                    'is resolved from the package, so a name it does not declare is refused.',
                }),
              handler: app.activate as never,
            })
            .command({
              command: 'deactivate <package>',
              describe: "Remove a package from an application, as 'name' or 'scope/name'",
              // eslint-disable-next-line @typescript-eslint/no-shadow
              builder: (yargs) =>
                yargs.positional('package', { type: 'string', demandOption: true }),
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
                    description:
                      'replace copies source fields verbatim, merge applies source values',
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
      .command(packagesCommand)
      .command(loginCommand)
      .command(logoutCommand)
      .command(publishCommand)
      .command(unpublishCommand)
      .command(outdatedCommand)
      .version(cliVersion)
      .help()
      .alias('h', 'help')
      /*
       * Without these, `appshell nonsens` printed nothing and exited 0, so a typo in a
       * script read as success. Every subcommand group already demands one; the top level
       * was the one that did not.
       *
       * `strictCommands` rather than `strict`: unknown *options* stay tolerated, because
       * global flags are added over time and rejecting them would break callers who pass a
       * newer flag to an older CLI. An unknown command has no such excuse.
       */
      .demandCommand(1, 'Specify a command. Run `appshell --help` to see them.')
      .strictCommands()
  );
};

export default buildCli;
