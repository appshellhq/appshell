/* eslint-disable no-param-reassign */
/* eslint-disable no-underscore-dangle */
import {
  activate,
  AppshellConfig,
  AppshellTemplate,
  manifestFrom,
  ModuleFederationPluginOptions,
  persistedContext,
  publish,
  resolveContext,
  Schema,
  SharedConfig,
  utils,
  validators,
} from '@appshell/config';
import { TOKEN_ROLES } from '@appshell/tokens';
import fs from 'fs';
import hash_sum from 'hash-sum';
import { entries, keys } from 'lodash';
import path from 'path';
import { validate } from 'schema-utils';
import {
  Compilation,
  Compiler,
  container,
  DefinePlugin,
  WebpackOptionsNormalized,
  WebpackPluginInstance,
  sources as webpackSources,
} from 'webpack';
import { isServing, writeDevHint } from './devHint';

type AppshellPluginOptions = {
  config?: string;
  registry?: string;
  application?: string;
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

/**
 * The store a package's vars are delivered into. It has to be one instance for the whole
 * page, so both the host and every package that reads vars must share it as a singleton.
 */
const VARS_RUNTIME = '@appshell/runtime';

/**
 * The federation container name, substituted into the package's own compilation so
 * `getVars()` in `@appshell/runtime/vars` can only ever return this package's vars. A shared
 * module cannot work this out for itself — it is one instance serving every package on
 * the page — so the scope has to be fixed at the call site, at build time.
 */
const SCOPE_DEFINE = '__APPSHELL_SCOPE__';

/**
 * A design token reference in emitted output. The optional comma is the whole point: a
 * reference with a fallback degrades on its own, one without does not.
 */
const TOKEN_REFERENCE = /var\(\s*--appshell-([a-z0-9-]+)\s*(,?)/g;

/** Text webpack emitted. Images and fonts cannot reference a token. */
const SCANNABLE = /\.(js|mjs|cjs|css|html)$/;

/**
 * Where a package's manifest is served from, relative to its own origin.
 *
 * Not a new convention: `manifestUrl` in every published manifest has always been
 * `<url>/appshell.manifest.json`. Until this was emitted, that URL resolved nowhere —
 * nothing dereferenced it at runtime, so the only thing that noticed was the CLI's
 * dev-server probe, which asked for it and got a 404 every time.
 *
 * Emitted as a compilation asset rather than written with `fs`, which is what makes it
 * work in both modes: webpack-dev-server serves assets from memory, so a served package
 * answers for it without anything touching disk, and a production build writes it to the
 * output directory alongside the bundle it describes.
 */
const MANIFEST_ASSET = 'appshell.manifest.json';

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
  application: string,
  id: string,
  token: string | undefined,
  retries: number,
  attempt = 1,
): Promise<void> => {
  try {
    await activate(registry, application, id, token);
  } catch (error) {
    if (!isConcurrentActivationError(error) || attempt >= retries) {
      throw error;
    }

    await delay(150 * attempt);
    await activateWithRetry(registry, application, id, token, retries, attempt + 1);
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
    application: {
      description: "Application to activate the published app in, as 'scope/name'",
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

    // Registry, application, and token are resolved from the CLI context at apply()
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

    // Vars are keyed by the federation container name and nothing else. That is the
    // scope the loader delivers them under, the scope that prefixes this package's
    // remote keys, and the scope compiled into the package by SCOPE_DEFINE. A `name:`
    // in appshell.config.yaml that diverges from it would key them where nothing reads,
    // and the old `|| 'unknown'` fallback made that failure silent.
    if (config.vars && !pluginOptions?.name) {
      throw new Error('Cannot scope vars: ModuleFederationPlugin has no name to key them by.');
    }

    const template: AppshellTemplate = {
      name,
      ...config,
      module: pluginOptions || {},
      vars: config.vars
        ? {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            [pluginOptions!.name!]: config.vars,
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

    // Only when the package actually declares vars. A package with nothing to read has
    // no reason to carry the store, and requiring it of everyone would be noise.
    if (keys(template.vars).length) {
      const { declared, singleton } = AppshellPlugin.sharedSingleton(
        template.module.shared,
        VARS_RUNTIME,
      );

      if (!declared || !singleton) {
        throw new Error(
          `Validation error: this package declares vars, so it must share '${VARS_RUNTIME}' ` +
            `as a singleton. Add \`shared: { '${VARS_RUNTIME}': { singleton: true } }\` to ` +
            `ModuleFederationPlugin. ${
              declared
                ? 'It is shared, but not as a singleton, so this package would get its own ' +
                  'empty store rather than the one the host delivers into.'
                : 'Without it there is nothing to deliver the vars into.'
            }`,
        );
      }
    }

    return true;
  }

  /**
   * Which tokens this package's output actually reaches for.
   *
   * Read from the emitted assets rather than declared. The CSS already states it, and a
   * hand-kept list is a second copy that goes stale the first time somebody adds a token
   * and forgets to update it. This cannot drift, because it *is* the usage.
   *
   * A role referenced both with and without a fallback counts as required: one place in
   * the package has nothing to fall back to.
   *
   * The blind spot is a reference built at runtime from a constructed string, which no
   * static scan sees — the same limit Tailwind has with dynamic class names. It fails
   * toward under-reporting, never toward inventing a requirement.
   *
   * Takes file contents rather than webpack assets: by `afterEmit` the compilation has
   * swapped its sources for `SizeOnlySource`, which knows a length and nothing else.
   * The files are on disk by then, which is what the hook means.
   */
  static tokenUsage(sources: Record<string, string> = {}) {
    const withFallback = new Set<string>();
    const withoutFallback = new Set<string>();
    const unknown = new Set<string>();

    Object.entries(sources ?? {})
      .filter(([name]) => SCANNABLE.test(name))
      .forEach(([, source]) => {
        for (
          let match = TOKEN_REFERENCE.exec(source);
          match;
          match = TOKEN_REFERENCE.exec(source)
        ) {
          const [, role, comma] = match;

          if (!TOKEN_ROLES.includes(role as never)) {
            unknown.add(role);
          } else if (comma) {
            withFallback.add(role);
          } else {
            withoutFallback.add(role);
          }
        }
      });

    return {
      required: [...withoutFallback].sort(),
      optional: [...withFallback].filter((role) => !withoutFallback.has(role)).sort(),
      unknown: [...unknown].sort(),
    };
  }

  /**
   * Whether a request is shared, and shared as a singleton. `shared` has four shapes —
   * an object, an array of names, an array of objects, or a mix — and a bare name shares
   * without making it a singleton, which for the vars store is the same as not sharing it.
   */
  static sharedSingleton(shared: ModuleFederationPluginOptions['shared'], request: string) {
    const groups = Array.isArray(shared) ? shared : [shared];

    return groups.filter(Boolean).reduce(
      (acc, group) => {
        if (typeof group === 'string') {
          return group === request ? { ...acc, declared: true } : acc;
        }

        const config = (group as Record<string, unknown>)[request];

        if (config === undefined) {
          return acc;
        }

        return {
          declared: true,
          singleton:
            acc.singleton || (typeof config === 'object' && !!(config as SharedConfig).singleton),
        };
      },
      { declared: false, singleton: false },
    );
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
    effective: { registry?: string; application?: string },
    persisted: { registry?: string; application?: string },
  ): string[] {
    const notices: string[] = [];

    if (persisted.registry && effective.registry && persisted.registry !== effective.registry) {
      notices.push(
        `Using registry ${effective.registry}, overriding your CLI context (${persisted.registry}).`,
      );
    }

    if (
      persisted.application &&
      effective.application &&
      persisted.application !== effective.application
    ) {
      notices.push(
        `Using application ${effective.application}, overriding your CLI context (${persisted.application}).`,
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

    // Applied from here rather than asked of the package author, because it taps
    // `compilation` and so still lands however this plugin is ordered. The `shared`
    // entry the store needs cannot be added the same way: ModuleFederationPlugin reads
    // its own options during its `apply`, which webpack has already run by the time it
    // gets to ours — hence the validation above rather than an injection here.
    new DefinePlugin({
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      [SCOPE_DEFINE]: JSON.stringify(template.module.name!),
    }).apply(compiler);

    const isDevelopment = compiler.options.mode === 'development';
    const context = resolveContext();

    // Precedence: explicit option, then the CLI context (env var, then ~/.appshell).
    const registry = this.options.registry ?? context.registry;
    const application = this.options.application ?? context.application;
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

    const notices = AppshellPlugin.overrideNotices({ registry, application }, persistedContext());

    /*
     * Sources have to be read while they are still sources. By `afterEmit` the compilation
     * has swapped them for `SizeOnlySource`, which knows a length and throws on the rest,
     * and reading the files back off disk instead is a race — the same build produced token
     * usage on one run and none on the next.
     *
     * `processAssets` at the reporting stage is where the output is final and still in
     * memory, which is what this needs.
     */
    let observed = { required: [] as string[], optional: [] as string[], unknown: [] as string[] };

    /*
     * Built once, during processAssets, and used for both the emitted asset and the
     * publish below. Reading it back off disk to publish would be a second substitution
     * pass over the same template — the shape that keeps one fact in two places and in
     * step only by attention.
     */
    let manifest: ReturnType<typeof manifestFrom> | undefined;

    compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
      compilation.hooks.processAssets.tap(
        { name: PLUGIN_NAME, stage: Compilation.PROCESS_ASSETS_STAGE_REPORT },
        (assets) => {
          observed = AppshellPlugin.tokenUsage(
            Object.fromEntries(
              Object.entries(assets).map(([name, source]) => [name, source.source().toString()]),
            ),
          );

          if (observed.required.length || observed.optional.length) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            template.tokens = {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              [template.module.name!]: {
                required: observed.required,
                optional: observed.optional,
              },
            };
          }

          // Emitted here, after the scan, so the file a browser can fetch and the
          // manifest the registry stores are the same object rather than two builds of it.
          manifest = manifestFrom(template);
          compilation.emitAsset(
            MANIFEST_ASSET,
            new webpackSources.RawSource(JSON.stringify(manifest)),
          );
        },
      );
    });

    compiler.hooks.afterEmit.tapPromise(PLUGIN_NAME, async (compilation) => {
      const logger = compilation.getLogger(PLUGIN_NAME);
      notices.forEach((notice) => logger.warn(notice));

      const outputDir = path.resolve(compilation.outputOptions.path || '');
      const outputFile = path.resolve(outputDir, 'appshell.template.json');

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      observed.unknown.forEach((role) =>
        logger.warn(
          `--appshell-${role} is not a design token. Check the spelling against the ` +
            `contract in @appshell/tokens; a name that is not a role resolves to nothing.`,
        ),
      );

      // `template.tokens` was set during processAssets, where the scan happens. Written
      // with `fs` rather than emitted, because webpack-dev-server keeps its assets in
      // memory and the CLI reads this one off disk while a dev server is running.
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

        if (application) {
          // Concurrent app startups can race on application revisions.
          // Retry activation a few times in dev to make one-command startup stable.
          await activateWithRetry(registry, application, id, token, isDevelopment ? 4 : 1);
        }

        compilation
          .getLogger(PLUGIN_NAME)
          .info(
            `${created ? 'Published' : 'Already published'} ${id}${
              application ? ` and activated in ${application}` : ''
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
