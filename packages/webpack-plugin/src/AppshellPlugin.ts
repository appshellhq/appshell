/* eslint-disable no-param-reassign */
/* eslint-disable no-underscore-dangle */
import {
  activate,
  AppshellConfig,
  AppshellTemplate,
  generateManifest,
  ModuleFederationPluginOptions,
  persistedContext,
  publish,
  resolveContext,
  Schema,
  utils,
  validators,
} from '@appshell/config';
import fs from 'fs';
import hash_sum from 'hash-sum';
import { entries, keys } from 'lodash';
import path from 'path';
import { validate } from 'schema-utils';
import { Compiler, container, WebpackOptionsNormalized, WebpackPluginInstance } from 'webpack';
import { isServing, writeDevHint } from './devHint';

type AppshellPluginOptions = {
  config?: string;
  registry?: string;
  environment?: string;
  publish?: boolean;
  force?: boolean;
};

// An env var set to an empty string or an explicit falsey value opts out.
const truthy = (value?: string): boolean | undefined =>
  value === undefined
    ? undefined
    : !['', '0', 'false', 'no', 'off'].includes(value.trim().toLowerCase());

type ModuleFederationPluginInstance = WebpackPluginInstance & {
  _options?: ModuleFederationPluginOptions;
  options?: ModuleFederationPluginOptions;
};

const PLUGIN_NAME = 'AppshellPlugin';

const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const isConcurrentActivationError = (error: unknown): boolean => {
  const message = (error as { message?: string })?.message ?? '';

  return (
    message.includes('was modified concurrently') ||
    (message.includes('Failed to activate') && message.includes('409'))
  );
};

const activateWithRetry = async (
  registry: string,
  environment: string,
  id: string,
  token: string | undefined,
  retries: number,
  attempt = 1,
): Promise<void> => {
  try {
    await activate(registry, environment, id, token);
  } catch (error) {
    if (!isConcurrentActivationError(error) || attempt >= retries) {
      throw error;
    }

    await delay(150 * attempt);
    await activateWithRetry(registry, environment, id, token, retries, attempt + 1);
  }
};

const schema: Schema = {
  title: 'AppshellPlugin',
  type: 'object',
  properties: {
    config: {
      description: 'The path to the appshell.config.yaml to process',
      type: 'string',
    },
    registry: {
      description: 'Base url of the appshell registry to publish to',
      type: 'string',
    },
    environment: {
      description: "Environment to activate the published app in, as 'scope/name'",
      type: 'string',
    },
    publish: {
      description:
        'Publish after every successful build. Defaults to true in development mode; otherwise opt in with APPSHELL_PUBLISH_ON_BUILD.',
      type: 'boolean',
    },
    force: {
      description:
        'Overwrite an existing version when content differs. Defaults to true in development mode. The registry only honors it when its own config allows.',
      type: 'boolean',
    },
  },
};

/**
 * AppshellPlugin produces app manifests that will subsequently be
 * compiled into the global Appshell configuration.
 */
export default class AppshellPlugin {
  defaults = {
    config: 'appshell.config.yaml',
  };

  options: AppshellPluginOptions = {
    config: this.defaults.config,
  };

  constructor(options?: AppshellPluginOptions) {
    if (options) {
      validate(schema, options, { name: PLUGIN_NAME });
    }

    // Registry, environment, and token are resolved from the CLI context at apply()
    // time; only explicit options are captured here.
    this.options = {
      ...this.defaults,
      ...options,
    };
  }

  static findModuleFederationPlugin(webpackConfig: WebpackOptionsNormalized) {
    const mfPlugin: ModuleFederationPluginInstance | undefined = webpackConfig.plugins?.find(
      (plugin) => plugin.constructor.name === container.ModuleFederationPlugin.name,
    );

    return mfPlugin;
  }

  static createTemplate(
    config: AppshellConfig,
    plugin: ModuleFederationPluginInstance,
  ): AppshellTemplate {
    const pluginOptions = plugin._options || plugin.options;
    const name = config.name || pluginOptions?.name;
    const template: AppshellTemplate = {
      name,
      ...config,
      module: pluginOptions || {},
      environment: config.environment
        ? {
            [name || 'unknown']: config.environment,
          }
        : {},
    };

    entries(template.remotes).forEach(([key, remote]) => {
      remote.id = hash_sum(key);
    });

    return template;
  }

  static validate(template: AppshellTemplate) {
    if (!template.module.name) {
      throw new Error('Module name is required.');
    }

    validators.AppshellTemplateValidator.validate(template);

    const pluginRemotes = keys(template.module.exposes).map(
      (key) => `${template.module.name}/${path.basename(key)}`,
    );
    const configuredRemotes = keys(template.remotes);

    if (!pluginRemotes.every((remote) => configuredRemotes.includes(remote))) {
      throw new Error(
        `Validation error: Missing entrypoint in appshell.config.yaml. Expected: ${pluginRemotes}, Found: ${configuredRemotes}`,
      );
    }

    if (
      !configuredRemotes
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        .filter((key) => key.startsWith(template.module.name!))
        .every((remote) => pluginRemotes.includes(remote))
    ) {
      throw new Error(
        `Validation error: Missing exposed entrypoint in ModuleFederationPlugin. Expected: ${configuredRemotes}, Found: ${pluginRemotes}`,
      );
    }

    return true;
  }

  /**
   * Publish identity is the npm identity of the package being built, not the module
   * federation name — the registry requires a lowercase name and has no other source
   * for a version. The scope is taken from the caller's token, so it is stripped here.
   */
  static identify(context: string) {
    const packageFile = path.resolve(context, 'package.json');

    if (!fs.existsSync(packageFile)) {
      throw new Error(`Cannot determine what to publish: no package.json at ${context}.`);
    }

    const { name, version } = JSON.parse(fs.readFileSync(packageFile, 'utf-8'));

    if (!name || !version) {
      throw new Error(`Cannot determine what to publish: ${packageFile} needs a name and version.`);
    }

    return { name: (name as string).replace(/^@[^/]+\//, ''), version: version as string };
  }

  /**
   * Warns when an env var or explicit option points somewhere other than the
   * developer's persisted CLI context, so an overridden target is never silent.
   */
  static overrideNotices(
    effective: { registry?: string; environment?: string },
    persisted: { registry?: string; environment?: string },
  ): string[] {
    const notices: string[] = [];

    if (persisted.registry && effective.registry && persisted.registry !== effective.registry) {
      notices.push(
        `Using registry ${effective.registry}, overriding your CLI context (${persisted.registry}).`,
      );
    }

    if (
      persisted.environment &&
      effective.environment &&
      persisted.environment !== effective.environment
    ) {
      notices.push(
        `Using environment ${effective.environment}, overriding your CLI context (${persisted.environment}).`,
      );
    }

    return notices;
  }

  /**
   * Apply the plugin
   * @param {Compiler} compiler the compiler instance
   * @returns {void}
   */
  apply(compiler: Compiler) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const configPath = path.resolve(this.options.config!);
    const config = utils.load<AppshellConfig>(configPath);
    const plugin = AppshellPlugin.findModuleFederationPlugin(compiler.options);

    if (!plugin) {
      // could hook in mmf plugin here and work off of config too
      throw new Error('Webpack ModuleFederationPlugin is required to use this plugin.');
    }

    const template = AppshellPlugin.createTemplate(config, plugin);
    AppshellPlugin.validate(template);

    const isDevelopment = compiler.options.mode === 'development';
    const context = resolveContext();

    // Precedence: explicit option, then the CLI context (env var, then ~/.appshell).
    const registry = this.options.registry ?? context.registry;
    const environment = this.options.environment ?? context.environment;
    const { token } = context;

    const requested = this.options.publish ?? truthy(process.env.APPSHELL_PUBLISH_ON_BUILD);
    // A dev loop publishes by default, so nobody has to toggle it off before committing.
    const shouldPublish = requested ?? isDevelopment;
    const force = this.options.force ?? isDevelopment;

    // Asking to publish with no registry anywhere is a configuration error; a dev-mode
    // default with no registry is not — it degrades to just writing the template.
    if (shouldPublish && requested && !registry) {
      throw new Error(
        'Publishing is enabled but no registry was given. Run `appshell config set registry <url>` or set APPSHELL_REGISTRY.',
      );
    }

    const notices = AppshellPlugin.overrideNotices({ registry, environment }, persistedContext());

    compiler.hooks.afterEmit.tapPromise(PLUGIN_NAME, async (compilation) => {
      const logger = compilation.getLogger(PLUGIN_NAME);
      notices.forEach((notice) => logger.warn(notice));

      const outputDir = path.resolve(compilation.outputOptions.path || '');
      const outputFile = path.resolve(outputDir, 'appshell.template.json');

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      fs.writeFileSync(outputFile, JSON.stringify(template));

      // Only while actually serving. A production build must never leave one behind for
      // tooling to mistake for a running dev server.
      if (isServing()) {
        writeDevHint(outputDir, compiler.options.devServer, `${template.module.filename ?? ''}`);
      }

      if (!shouldPublish) {
        return;
      }

      if (!registry) {
        logger.warn(
          'Skipping publish: no registry configured. Run `appshell config set registry <url>` or set APPSHELL_REGISTRY.',
        );
        return;
      }

      try {
        const manifest = await generateManifest(outputFile);

        if (!manifest) {
          throw new Error(`No manifest was generated from ${outputFile}.`);
        }

        const { name, version } = AppshellPlugin.identify(compiler.context);
        const { id, created } = await publish({
          registry,
          token,
          name,
          version,
          manifest,
          force,
        });

        if (environment) {
          // Concurrent app startups can race on environment revisions.
          // Retry activation a few times in dev to make one-command startup stable.
          await activateWithRetry(registry, environment, id, token, isDevelopment ? 4 : 1);
        }

        compilation
          .getLogger(PLUGIN_NAME)
          .info(
            `${created ? 'Published' : 'Already published'} ${id}${
              environment ? ` and activated in ${environment}` : ''
            }`,
          );
      } catch (error) {
        const err = error as Error;

        if (
          isDevelopment &&
          force &&
          err?.message?.includes('already published with different content')
        ) {
          err.message = `${err.message} Development mode requested force publish, but the registry refused overwrite. Enable ALLOW_FORCE_PUBLISH=true (or AUTH_MODE=none) on the registry for local/dev.`;
        }

        // Surfaced as a compilation error so watch mode reports it and keeps going.
        compilation.errors.push(err);
      }
    });
  }
}
