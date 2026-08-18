/* eslint-disable no-param-reassign */
/* eslint-disable no-underscore-dangle */
import {
  activate,
  AppshellConfig,
  AppshellTemplate,
  generateManifest,
  ModuleFederationPluginOptions,
  publish,
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

type AppshellPluginOptions = {
  config?: string;
  registry?: string;
  environment?: string;
  publish?: boolean;
  force?: boolean;
};

type ModuleFederationPluginInstance = WebpackPluginInstance & {
  _options?: ModuleFederationPluginOptions;
  options?: ModuleFederationPluginOptions;
};

const PLUGIN_NAME = 'AppshellPlugin';

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
      description: 'Publish after every successful build. Defaults to APPSHELL_PUBLISH_ON_BUILD',
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

    this.options = {
      ...this.defaults,
      registry: process.env.APPSHELL_REGISTRY,
      // The CLI splits scope and name; activate() wants them joined as scope/name.
      environment: AppshellPlugin.resolveEnvironment(),
      publish: !!process.env.APPSHELL_PUBLISH_ON_BUILD,
      ...options,
    };
  }

  static resolveEnvironment(): string | undefined {
    const name = process.env.APPSHELL_ENVIRONMENT;

    if (!name) {
      return undefined;
    }

    if (name.includes('/')) {
      return name;
    }

    return `${process.env.APPSHELL_SCOPE_ID || 'default'}/${name}`;
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

    const { registry, environment } = this.options;

    if (this.options.publish && !registry) {
      throw new Error(
        'Publishing is enabled but no registry was given. Set APPSHELL_REGISTRY or pass `registry`.',
      );
    }

    // In a dev loop the manifest changes at a static version; force lets the registry
    // accept the overwrite. It is a request only — the registry decides whether to honor it.
    const force = this.options.force ?? compiler.options.mode === 'development';

    compiler.hooks.afterEmit.tapPromise(PLUGIN_NAME, async (compilation) => {
      const outputDir = path.resolve(compilation.outputOptions.path || '');
      const outputFile = path.resolve(outputDir, 'appshell.template.json');

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      fs.writeFileSync(outputFile, JSON.stringify(template));

      if (!this.options.publish) {
        return;
      }

      try {
        const manifest = await generateManifest(outputFile);

        if (!manifest) {
          throw new Error(`No manifest was generated from ${outputFile}.`);
        }

        const { name, version } = AppshellPlugin.identify(compiler.context);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const { id, created } = await publish({
          registry: registry!,
          token: process.env.APPSHELL_TOKEN,
          name,
          version,
          manifest,
          force,
        });

        if (environment) {
          await activate(registry!, environment, id, process.env.APPSHELL_TOKEN);
        }

        compilation
          .getLogger(PLUGIN_NAME)
          .info(
            `${created ? 'Published' : 'Already published'} ${id}${
              environment ? ` and activated in ${environment}` : ''
            }`,
          );
      } catch (error) {
        // Surfaced as a compilation error so watch mode reports it and keeps going.
        compilation.errors.push(error as Error);
      }
    });
  }
}
