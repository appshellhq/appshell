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
import initConfigHandler, { InitArgs } from './handlers/config/init';
import listConfigHandler, { ListConfigArgs } from './handlers/config/list';
import setConfigHandler, { SetConfigArgs } from './handlers/config/set';
import deregisterManifestHandler, { DeregisterManifestArgs } from './handlers/deregister';
import * as env from './handlers/env';
import generateEnvHandler, { GenerateEnvArgs } from './handlers/generate.env';
import generateGlobalConfigHandler, {
  GenerateGlobalConfigArgs,
} from './handlers/generate.global-config';
import generateManifestHandler, { GenerateManifestArgs } from './handlers/generate.manifest';
import loginHandler, { LoginArgs, logout } from './handlers/login';
import outdatedHandler, { OutdatedArgs } from './handlers/outdated';
import publishHandler, { PublishArgs } from './handlers/publish';
import registerManifestHandler, { RegisterManifestArgs } from './handlers/register';

const loadConfig = (cPath: string) => {
  const originalDebug = console.debug;

  console.debug = () => {};
  const c = readConfig(cPath);
  console.debug = originalDebug;

  return c;
};
const configPath = process.env.APPSHELL_CONFIG || path.join(os.homedir(), '.appshell', 'config');
const config = loadConfig(configPath);

/** Deprecated file-registry commands predate the registry service. */
const legacyRegistry = './appshell_registry';

const registerManifestCommand: yargs.CommandModule<unknown, RegisterManifestArgs> = {
  command: 'register',
  describe: false,
  deprecated: 'Use `appshell publish` against an appshell registry instead.',
  // eslint-disable-next-line @typescript-eslint/no-shadow
  builder: (yargs) =>
    yargs
      .option('registry', {
        default: legacyRegistry,
        description: 'Registry with which the app is registered',
      })
      .option('manifest', {
        alias: 'm',
        string: true,
        type: 'array',
        requiresArg: true,
        description: 'One or more manifests to register',
      })
      .option('allowOverrides', {
        default: false,
        boolean: false,
        type: 'boolean',
        description: 'Allow overrides to be propagated',
      }) as yargs.Argv<RegisterManifestArgs>,
  handler: registerManifestHandler,
};

const deregisterManifestCommand: yargs.CommandModule<unknown, DeregisterManifestArgs> = {
  command: 'deregister',
  describe: false,
  deprecated: 'Use `appshell unpublish` against an appshell registry instead.',
  // eslint-disable-next-line @typescript-eslint/no-shadow
  builder: (yargs) =>
    yargs
      .option('key', {
        string: true,
        type: 'array',
        requiresArg: true,
        description: 'One or more keys for manifests to deregister',
      })
      .option('registry', {
        default: legacyRegistry,
        description: 'Registry with which the app is deregistered',
      }) as yargs.Argv<DeregisterManifestArgs>,
  handler: deregisterManifestHandler,
};

const generateGlobalConfigCommand: yargs.CommandModule<unknown, GenerateGlobalConfigArgs> = {
  command: 'global-config',
  describe: false,
  deprecated: 'Use `appshell env composition` against an appshell registry instead.',
  // eslint-disable-next-line @typescript-eslint/no-shadow
  builder: (yargs) =>
    yargs
      .option('outDir', {
        alias: 'o',
        default: 'dist',
        type: 'string',
        description: 'Output location for the global appshell configuration',
      })
      .option('outFile', {
        alias: 'f',
        default: 'appshell.config.json',
        type: 'string',
        description: 'Output filename for the global appshell configuration',
      })
      .option('validateRegistrySslCert', {
        alias: 'v',
        default: true,
        type: 'boolean',
        description:
          "If false, registry files are fetched without validating the registry's SSL cert",
      })
      .option('proxyUrl', {
        alias: 'p',
        default: process.env.APPSHELL_PROXY_URL || '',
        type: 'string',
        description: 'Proxy url for calls to get external resources',
        global: true,
      })
      .option('registry', {
        string: true,
        type: 'array',
        requiresArg: true,
        default: [legacyRegistry],
        description:
          'One or more registries to query for other global configurations to merge into a single global appshell configuration',
      }) as yargs.Argv<GenerateGlobalConfigArgs>,
  handler: generateGlobalConfigHandler,
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

const generateEnvCommand: yargs.CommandModule<unknown, GenerateEnvArgs> = {
  command: 'env',
  describe: 'Generate the runtime environment js file that reflects the current process.env',
  // eslint-disable-next-line @typescript-eslint/no-shadow
  builder: (yargs) =>
    yargs
      .option('outDir', {
        alias: 'o',
        default: 'dist',
        requiresArg: true,
        type: 'string',
        description: 'Output location for the runtime environment js',
      })
      .option('outFile', {
        alias: 'f',
        default: 'appshell.env.js',
        type: 'string',
        description: 'Output filename for the runtime environment js',
      })
      .option('prefix', {
        alias: 'p',
        default: '',
        type: 'string',
        description: 'Only capture environment variables that start with prefix',
      })
      .option('globalName', {
        alias: 'g',
        default: '__appshell_env__',
        type: 'string',
        description: 'Global variable name window[globalName] used in the output js',
      }),
  handler: generateEnvHandler,
};

const outdatedCommand: yargs.CommandModule<unknown, OutdatedArgs> = {
  command: 'outdated',
  aliases: ['o'],
  describe: 'Analyzes shared dependencies for outdated versions',
  // eslint-disable-next-line @typescript-eslint/no-shadow
  builder: (yargs) =>
    yargs
      .option('registry', {
        description: 'Registry against which the app is compared',
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
        // Only read from the environment so the secret never lands in shell history.
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

const publishCommand: yargs.CommandModule<unknown, PublishArgs> = {
  command: 'publish',
  describe: 'Publish an app to the appshell registry',
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
        description: 'App name. Defaults to the unscoped package.json name',
      })
      .option('version', {
        type: 'string',
        description: 'App version. Defaults to the package.json version',
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
      }) as yargs.Argv<PublishArgs>,
  handler: publishHandler,
};

const unpublishCommand: yargs.CommandModule<
  unknown,
  { registry: string; scopeId: string; name: string; version: string }
> = {
  command: 'unpublish <name> <version>',
  describe: 'Remove a published app version from the appshell registry',
  // eslint-disable-next-line @typescript-eslint/no-shadow
  builder: (yargs) =>
    yargs
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
    alias: 'a',
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
  .option('environment', {
    alias: 'e',
    describe: "Environment to operate against, as 'name' or 'scope/name'",
    default: process.env.APPSHELL_ENVIRONMENT || config.environment,
    type: 'string',
    global: true,
  })
  .option('scopeId', {
    describe: 'Scope that owns unqualified apps and environments',
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
    builder: (yargs) =>
      yargs
        .command(generateManifestCommand)
        .command(generateEnvCommand)
        .command(generateGlobalConfigCommand)
        .demandCommand(),
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
    command: 'env <target>',
    describe: 'Manage appshell environments',
    handler: () => {},
    // eslint-disable-next-line @typescript-eslint/no-shadow
    builder: (yargs) =>
      yargs
        .command({
          command: 'list',
          aliases: ['ls'],
          describe: 'List environments',
          // eslint-disable-next-line @typescript-eslint/no-shadow
          builder: (yargs) =>
            yargs.option('owner', { type: 'string', description: 'Filter by owner' }),
          handler: env.list as never,
        })
        .command({
          command: 'get [name]',
          describe: 'Show a single environment',
          handler: env.get as never,
        })
        .command({
          command: 'create <name>',
          describe: 'Create an environment',
          // eslint-disable-next-line @typescript-eslint/no-shadow
          builder: (yargs) =>
            yargs
              .positional('name', { type: 'string', demandOption: true })
              .option('ephemeral', { boolean: true, default: false, type: 'boolean' })
              .option('visibility', { type: 'string', choices: ['public', 'private'] as const })
              .option('shell-bundle-url', {
                type: 'string',
                describe: 'Shell bundle this environment loads, instead of the registry default',
              }),
          handler: env.create as never,
        })
        .command({
          command: 'delete [name]',
          aliases: ['rm'],
          describe: 'Delete an environment',
          handler: env.remove as never,
        })
        .command({
          command: 'deactivate <app>',
          describe: "Remove an app from an environment, as 'name' or 'scope/name'",
          // eslint-disable-next-line @typescript-eslint/no-shadow
          builder: (yargs) => yargs.positional('app', { type: 'string', demandOption: true }),
          handler: env.deactivate as never,
        })
        .command({
          command: 'revisions [name]',
          describe: 'List an environment revision history',
          // eslint-disable-next-line @typescript-eslint/no-shadow
          builder: (yargs) => yargs.option('limit', { type: 'number' }),
          handler: env.revisions as never,
        })
        .command({
          command: 'rollback [name]',
          describe: 'Roll an environment back to a previous revision',
          // eslint-disable-next-line @typescript-eslint/no-shadow
          builder: (yargs) =>
            yargs.option('to', { type: 'number', demandOption: true, description: 'Revision' }),
          handler: env.rollback as never,
        })
        .command({
          command: 'composition [name]',
          describe: 'Print the resolved composition for an environment',
          handler: env.composition as never,
        })
        .command({
          command: 'open [name]',
          describe: 'Print the shell url for an environment',
          handler: env.open as never,
        })
        .command({
          command: 'sync',
          describe: 'Sync a target environment from a source environment',
          // eslint-disable-next-line @typescript-eslint/no-shadow
          builder: (yargs) =>
            yargs
              .option('from', {
                type: 'string',
                demandOption: true,
                description: "Source environment as 'name' or 'scope/name'",
              })
              .option('to', {
                type: 'string',
                description:
                  "Target environment as 'name' or 'scope/name'. Defaults to --environment.",
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
                  'apps',
                  'shell',
                  'overrides',
                  'allowOverrides',
                  'sharedBaselines',
                  'sharedDepsEnforcement',
                  'visibility',
                ] as const,
                description: 'Optional list of environment sections to sync',
              }),
          handler: env.sync as never,
        })
        .command({
          command: 'clone',
          describe: 'Create a new environment by cloning a source environment',
          // eslint-disable-next-line @typescript-eslint/no-shadow
          builder: (yargs) =>
            yargs
              .option('from', {
                type: 'string',
                demandOption: true,
                description: "Source environment as 'name' or 'scope/name'",
              })
              .option('to', {
                type: 'string',
                description:
                  "Target environment as 'name' or 'scope/name'. Defaults to --environment.",
              })
              .option('visibility', {
                type: 'string',
                choices: ['public', 'private'] as const,
                description: 'Optional visibility override on the target environment',
              })
              .option('ephemeral', {
                boolean: true,
                type: 'boolean',
                description: 'Optional ephemeral override on the target environment',
              }),
          handler: env.clone as never,
        })
        .demandCommand(),
  })
  .command(loginCommand)
  .command(logoutCommand)
  .command(publishCommand)
  .command(unpublishCommand)
  .command(outdatedCommand)
  .command(registerManifestCommand)
  .command(deregisterManifestCommand)
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
