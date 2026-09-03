/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  activate,
  generateManifest,
  persistedContext,
  publish,
  resolveContext,
} from '@appshell/config';
import fs from 'fs';
import { values } from 'lodash';
import { rimrafSync } from 'rimraf';
import { Compilation, container, DefinePlugin, WebpackOptionsNormalized } from 'webpack';
import AppshellPlugin from '../src/AppshellPlugin';
import sampleConfig from './assets/complete-config.json';
import missingConfiguredEntrypoint from './assets/missing-configured-entrypoint.json';
import missingRemoteEntrypoint from './assets/missing-remote-entrypoint.json';
import { MODULE_FEDERATION_PLUGIN_OPTIONS } from './assets/module-federation-plugin-options';
import webpackConfig from './assets/webpack.config';

jest.mock('@appshell/config', () => ({
  ...jest.requireActual('@appshell/config'),
  activate: jest.fn(),
  generateManifest: jest.fn(),
  publish: jest.fn(),
  resolveContext: jest.fn(),
  persistedContext: jest.fn(),
}));

const mocked = {
  activate: activate as jest.MockedFunction<typeof activate>,
  generateManifest: generateManifest as jest.MockedFunction<typeof generateManifest>,
  publish: publish as jest.MockedFunction<typeof publish>,
  resolveContext: resolveContext as jest.MockedFunction<typeof resolveContext>,
  persistedContext: persistedContext as jest.MockedFunction<typeof persistedContext>,
};

/**
 * A compiler that fires the hooks webpack fires, in the order webpack fires them.
 *
 * The previous version recorded `hooks.compilation` as a `jest.fn()` and never invoked
 * it, so nothing the plugin does in `processAssets` had ever run under test: the token
 * scan, the token usage written onto the template, and the manifest asset. All three were
 * covered only by a real compilation in emitManifest.spec.ts. A double that accepts a tap
 * and never calls it does not merely leave a gap — it reports success for code that never
 * executed.
 */
class MockCompiler {
  options: Partial<WebpackOptionsNormalized>;

  compilation: Partial<Compilation>;

  context = 'packages/webpack-plugin';

  private afterEmit: Record<string, (compilation: Partial<Compilation>) => Promise<void>> = {};

  /*
   * Kept by the name each tap registered under, so only this plugin's are fired.
   *
   * AppshellPlugin applies DefinePlugin, which taps the same hook and expects webpack's
   * second argument, a live NormalModuleFactory, plus dependency templates and compilation
   * hooks off a WeakMap. Stubbing all of that would be reimplementing webpack inside a
   * unit test to exercise a plugin that is not the subject. Whether DefinePlugin works is
   * webpack's business; a real compilation in emitManifest.spec.ts covers the two of them
   * together.
   */
  private onCompilation: { name: string; tap: (compilation: Partial<Compilation>) => void }[] = [];

  private onProcessAssets: ((assets: Record<string, unknown>) => void)[] = [];

  hooks = {
    afterEmit: {
      tapPromise: (
        name: string,
        callback: (compilation: Partial<Compilation>) => Promise<void>,
      ) => {
        this.afterEmit[name] = callback;
      },
    },
    compilation: {
      tap: (name: string, callback: (compilation: Partial<Compilation>) => void) => {
        this.onCompilation.push({ name, tap: callback });
      },
    },
  };

  constructor(options: Partial<WebpackOptionsNormalized>, compilation: Partial<Compilation>) {
    this.options = options;
    this.compilation = {
      ...compilation,
      hooks: {
        processAssets: {
          tap: (_options: unknown, callback: (assets: Record<string, unknown>) => void) => {
            this.onProcessAssets.push(callback);
          },
        },
      },
      emitAsset: (name: string, source: { source: () => string | Buffer }) => {
        (this.compilation.assets as Record<string, unknown>)[name] = source;
      },
    } as unknown as Partial<Compilation>;
  }

  /** The emitted asset by name, as the string a dev server would serve. */
  asset(name: string): string | undefined {
    const source = (this.compilation.assets as Record<string, { source?: () => unknown }>)?.[name];

    return source?.source ? String(source.source()) : undefined;
  }

  /**
   * One build, in webpack's order: the compilation hook, then processAssets over whatever
   * the compilation holds, then afterEmit.
   */
  async compile() {
    this.onCompilation
      .filter(({ name }) => name === 'AppshellPlugin')
      .forEach(({ tap }) => tap(this.compilation));
    this.onProcessAssets.forEach((tap) =>
      tap((this.compilation.assets ?? {}) as Record<string, unknown>),
    );

    await Promise.all(
      values(this.afterEmit).map((handler) => handler.call(null, this.compilation)),
    );
  }
}

describe('AppshellPlugin', () => {
  const packageName = 'webpack-plugin';
  const config = `packages/${packageName}/__tests__/assets/appshell.config.yaml`;
  const configsDir = `packages/${packageName}/__tests__/assets/app_manifests`;
  const registry = 'https://registry.example.com';

  let compiler: MockCompiler;
  let errors: Error[];
  let logger: { info: jest.Mock; warn: jest.Mock };

  beforeEach(() => {
    const plugins = [new container.ModuleFederationPlugin(MODULE_FEDERATION_PLUGIN_OPTIONS)];
    errors = [];
    logger = { info: jest.fn(), warn: jest.fn() };
    compiler = new MockCompiler(
      { plugins },
      {
        outputOptions: { path: '' },
        // Every real compilation has these; the plugin reads them to see which design
        // tokens the emitted output reaches for.
        assets: {},
        errors: errors as any,
        getLogger: (() => logger) as any,
      },
    );

    mocked.generateManifest.mockResolvedValue({ remotes: {} } as any);
    mocked.publish.mockResolvedValue({ id: 'acme/widgets@1.0.0', created: true });
    mocked.activate.mockResolvedValue(undefined);
    // Hermetic by default: no persisted CLI context, nothing resolved from ~/.appshell.
    mocked.resolveContext.mockReturnValue({ scopeId: 'default' });
    mocked.persistedContext.mockReturnValue({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    delete process.env.APPSHELL_PUBLISH_ON_BUILD;
    delete process.env.APPSHELL_REGISTRY;
    delete process.env.APPSHELL_APPLICATION;
    delete process.env.APPSHELL_SCOPE_ID;
    rimrafSync(configsDir);
  });

  describe('validate', () => {
    it('should throw if config is missing remote entrypoints defined in the MF plugin', () => {
      expect(() => AppshellPlugin.validate(missingRemoteEntrypoint as any)).toThrowError(
        /Validation error: Missing entrypoint/i,
      );
    });

    it('should throw if config has remote entrypoints not defined in the MF plugin', () => {
      expect(() => AppshellPlugin.validate(missingConfiguredEntrypoint as any)).toThrowError(
        /Validation error: Missing exposed entrypoint in ModuleFederationPlugin/i,
      );
    });

    const declaringVars = (shared: unknown) => ({
      ...(sampleConfig as any),
      vars: { TestModule: { RUNTIME_ENV: 'test' } },
      module: { ...MODULE_FEDERATION_PLUGIN_OPTIONS, shared },
    });

    it('should throw if a package declaring vars does not share the store', () => {
      expect(() => AppshellPlugin.validate(declaringVars({ package1: '1.0.0' }))).toThrowError(
        /must share '@appshell\/runtime' as a singleton/i,
      );
    });

    it('should say so when the store is shared but not as a singleton', () => {
      expect(() =>
        AppshellPlugin.validate(declaringVars({ '@appshell/runtime': { eager: true } })),
      ).toThrowError(/shared, but not as a singleton/i);
    });

    it('should treat a bare name as shared without being a singleton', () => {
      expect(() => AppshellPlugin.validate(declaringVars(['@appshell/runtime']))).toThrowError(
        /shared, but not as a singleton/i,
      );
    });

    it('should accept the store declared in the array form', () => {
      expect(
        AppshellPlugin.validate(declaringVars([{ '@appshell/runtime': { singleton: true } }])),
      ).toBe(true);
    });

    // A package with nothing to read has no reason to carry the store.
    it('should not require the store of a package that declares no vars', () => {
      expect(
        AppshellPlugin.validate({
          ...(sampleConfig as any),
          vars: {},
          module: { ...MODULE_FEDERATION_PLUGIN_OPTIONS, shared: { package1: '1.0.0' } },
        }),
      ).toBe(true);
    });
  });

  describe('tokenUsage', () => {
    // A reference with a fallback degrades on its own; one without has no plan B.
    it('should split required from optional on whether a fallback is present', () => {
      const { required, optional } = AppshellPlugin.tokenUsage({
        'main.css':
          '.a{color:var(--appshell-on-surface)}.b{background:var(--appshell-primary, #0af)}',
      });

      expect(required).toEqual(['on-surface']);
      expect(optional).toEqual(['primary']);
    });

    // One place in the package having nothing to fall back to settles it for the package.
    it('should treat a role used both ways as required', () => {
      const { required, optional } = AppshellPlugin.tokenUsage({
        'main.css': 'var(--appshell-primary, #0af) var(--appshell-primary)',
      });

      expect(required).toEqual(['primary']);
      expect(optional).toEqual([]);
    });

    it('should report a name that is not a role rather than counting it as a need', () => {
      const { required, optional, unknown } = AppshellPlugin.tokenUsage({
        'main.css': 'var(--appshell-primry)',
      });

      expect(unknown).toEqual(['primry']);
      expect(required).toEqual([]);
      expect(optional).toEqual([]);
    });

    it('should find tokens in javascript as well as stylesheets', () => {
      const { required } = AppshellPlugin.tokenUsage({
        'main.js': 'const s={color:"var(--appshell-danger)"}',
      });

      expect(required).toEqual(['danger']);
    });

    it('should not scan assets that cannot reference a token', () => {
      const { required } = AppshellPlugin.tokenUsage({
        'logo.svg': 'var(--appshell-primary)',
        'font.woff2': 'var(--appshell-border)',
      });

      expect(required).toEqual([]);
    });

    it('should tolerate whitespace inside the reference', () => {
      const { required, optional } = AppshellPlugin.tokenUsage({
        'main.css': 'var( --appshell-surface ) var( --appshell-border , red)',
      });

      expect(required).toEqual(['surface']);
      expect(optional).toEqual(['border']);
    });

    it('should report nothing for output that uses no tokens', () => {
      expect(AppshellPlugin.tokenUsage({ 'main.js': 'console.log(1)' })).toEqual({
        required: [],
        optional: [],
        unknown: [],
      });
    });
  });

  describe('createTemplate', () => {
    const pluginWith = (options: any) => ({ _options: options } as any);

    it('should key vars by the federation container name', () => {
      const template = AppshellPlugin.createTemplate(
        { vars: { RUNTIME_ENV: 'test' } } as any,
        pluginWith(MODULE_FEDERATION_PLUGIN_OPTIONS),
      );

      expect(template.vars).toEqual({ TestModule: { RUNTIME_ENV: 'test' } });
    });

    // The scope the loader delivers under comes from the remote key, which is prefixed by
    // the federation name. Keying vars by a divergent `name:` would deliver them nowhere.
    it('should ignore a config name that diverges from the federation name', () => {
      const template = AppshellPlugin.createTemplate(
        { name: 'SomethingElse', vars: { RUNTIME_ENV: 'test' } } as any,
        pluginWith(MODULE_FEDERATION_PLUGIN_OPTIONS),
      );

      expect(template.vars).toEqual({ TestModule: { RUNTIME_ENV: 'test' } });
    });

    it('should refuse to guess a scope for vars when the MF plugin has no name', () => {
      expect(() =>
        AppshellPlugin.createTemplate(
          { vars: { RUNTIME_ENV: 'test' } } as any,
          pluginWith({ ...MODULE_FEDERATION_PLUGIN_OPTIONS, name: undefined }),
        ),
      ).toThrowError(/Cannot scope vars/i);
    });
  });

  describe('findModuleFederationPlugin', () => {
    it('should find ModuleFederationPlugin if it exists', () => {
      const moduleFederationPlugin = AppshellPlugin.findModuleFederationPlugin(
        webpackConfig as any,
      );

      expect(moduleFederationPlugin).toBeTruthy();
    });

    it('should return undefined if ModuleFederationPlugin does not exist', () => {
      webpackConfig.plugins = [];
      expect(AppshellPlugin.findModuleFederationPlugin(webpackConfig as any)).toBeUndefined();
    });
  });

  describe('defaults', () => {
    it('should default config to appshell.config.yaml', () => {
      const plugin = new AppshellPlugin();

      expect(plugin.options.config).toEqual('appshell.config.yaml');
    });
  });

  describe('apply', () => {
    it('should throw if ModuleFederationPlugin is not found', () => {
      const plugin = new AppshellPlugin({ config });

      compiler.options.plugins = [];

      expect(() => plugin.apply(compiler as any)).toThrowError(
        /Webpack ModuleFederationPlugin is required/i,
      );
    });

    it('should compile the federation name into the package as its scope', () => {
      const applied: Record<string, unknown>[] = [];
      jest
        .spyOn(DefinePlugin.prototype, 'apply')
        .mockImplementation(function capture(this: DefinePlugin) {
          applied.push(this.definitions);
        });
      jest.spyOn(fs, 'writeFileSync').mockImplementation();

      new AppshellPlugin({ config }).apply(compiler as any);

      expect(applied).toEqual([{ __APPSHELL_SCOPE__: '"TestModule"' }]);
    });

    it('should write configuration to configsDir', async () => {
      const writeFileSyncSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation();
      const plugin = new AppshellPlugin({ config });

      plugin.apply(compiler as any);
      await compiler.compile();

      expect(writeFileSyncSpy).toHaveBeenCalledWith(
        expect.anything(),
        JSON.stringify(sampleConfig),
      );
    });

    it('should not publish outside development mode unless asked', async () => {
      jest.spyOn(fs, 'writeFileSync').mockImplementation();
      const plugin = new AppshellPlugin({ config, registry });

      plugin.apply(compiler as any);
      await compiler.compile();

      expect(mocked.publish).not.toHaveBeenCalled();
    });

    it('should publish by default in development mode', async () => {
      jest.spyOn(fs, 'writeFileSync').mockImplementation();
      mocked.resolveContext.mockReturnValue({ scopeId: 'default', registry });
      compiler.options.mode = 'development';
      const plugin = new AppshellPlugin({ config });

      plugin.apply(compiler as any);
      await compiler.compile();

      expect(mocked.publish).toHaveBeenCalledWith(
        expect.objectContaining({ registry, force: true }),
      );
    });

    it('should opt out when APPSHELL_PUBLISH_ON_BUILD is a falsey string with whitespace', async () => {
      jest.spyOn(fs, 'writeFileSync').mockImplementation();
      mocked.resolveContext.mockReturnValue({ scopeId: 'default', registry });
      process.env.APPSHELL_PUBLISH_ON_BUILD = ' false ';
      compiler.options.mode = 'development';
      const plugin = new AppshellPlugin({ config });

      plugin.apply(compiler as any);
      await compiler.compile();

      expect(mocked.publish).not.toHaveBeenCalled();
    });

    it('should resolve the registry from the CLI context', async () => {
      jest.spyOn(fs, 'writeFileSync').mockImplementation();
      mocked.resolveContext.mockReturnValue({ scopeId: 'default', registry });
      const plugin = new AppshellPlugin({ config, publish: true });

      plugin.apply(compiler as any);
      await compiler.compile();

      expect(mocked.publish).toHaveBeenCalledWith(expect.objectContaining({ registry }));
    });

    it('should skip publish in development when no registry is configured', async () => {
      jest.spyOn(fs, 'writeFileSync').mockImplementation();
      compiler.options.mode = 'development';
      const plugin = new AppshellPlugin({ config });

      plugin.apply(compiler as any);
      await compiler.compile();

      expect(mocked.publish).not.toHaveBeenCalled();
      expect(errors).toHaveLength(0);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringMatching(/no registry configured/i));
    });

    it('should warn when an option overrides the persisted CLI context', async () => {
      jest.spyOn(fs, 'writeFileSync').mockImplementation();
      mocked.persistedContext.mockReturnValue({ registry: 'https://persisted.example.com' });
      const plugin = new AppshellPlugin({ config, registry, publish: true });

      plugin.apply(compiler as any);
      await compiler.compile();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringMatching(/overriding your CLI context/i),
      );
    });

    it('should fail before building when publishing without a registry', () => {
      const plugin = new AppshellPlugin({ config, publish: true });

      expect(() => plugin.apply(compiler as any)).toThrowError(/no registry was given/i);
    });

    /*
     * All of this runs in processAssets, which the compiler double used to record and
     * never invoke. Every assertion below passed vacuously before, or would have.
     */
    describe('processAssets', () => {
      it('should emit the manifest as a compilation asset', async () => {
        jest.spyOn(fs, 'writeFileSync').mockImplementation();
        new AppshellPlugin({ config, publish: false }).apply(compiler as any);
        await compiler.compile();

        expect(compiler.asset('appshell.manifest.json')).toBeDefined();
      });

      it('should emit a manifest with the remotes substituted', async () => {
        jest.spyOn(fs, 'writeFileSync').mockImplementation();
        new AppshellPlugin({ config, publish: false }).apply(compiler as any);
        await compiler.compile();

        const manifest = JSON.parse(compiler.asset('appshell.manifest.json') as string);

        expect(Object.keys(manifest.remotes)).toEqual(
          expect.arrayContaining(['TestModule/Foo', 'TestModule/Bar']),
        );
      });

      /*
       * Substitution writes in place, and building the manifest here from the same object
       * written to disk at afterEmit replaced the template's own placeholders with values
       * from the build environment — `${RUNTIME_ENV}` became the string "undefined".
       *
       * A template is meant to carry placeholders; that is the whole distinction between
       * it and a manifest. Nothing downstream would have contradicted it, and no test
       * could see it while the compilation hook was never fired.
       */
      it('should leave the template it was built from untouched', async () => {
        const written = jest.spyOn(fs, 'writeFileSync').mockImplementation();
        new AppshellPlugin({ config, publish: false }).apply(compiler as any);
        await compiler.compile();

        const template = JSON.parse(written.mock.calls[0][1] as string);

        /* eslint-disable no-template-curly-in-string -- the placeholder is the subject */
        expect(template.vars.TestModule.RUNTIME_ENV).toBe('${RUNTIME_ENV}');
        expect(template.remotes['TestModule/Foo'].url).toBe('${APPS_TEST_URL}');
        /* eslint-enable no-template-curly-in-string */
      });

      it('should write the scanned token usage onto the template', async () => {
        const written = jest.spyOn(fs, 'writeFileSync').mockImplementation();
        compiler.compilation.assets = {
          'main.css': { source: () => '.a{color:var(--appshell-primary)}' },
        } as never;
        new AppshellPlugin({ config, publish: false }).apply(compiler as any);
        await compiler.compile();

        const template = JSON.parse(written.mock.calls[0][1] as string);

        expect(template.tokens.TestModule.required).toContain('primary');
      });

      // The scan has to precede the emit, or the manifest understates what the package
      // needs and nothing downstream disagrees.
      it('should carry that same usage into the emitted manifest', async () => {
        jest.spyOn(fs, 'writeFileSync').mockImplementation();
        compiler.compilation.assets = {
          'main.css': { source: () => '.a{color:var(--appshell-primary)}' },
        } as never;
        new AppshellPlugin({ config, publish: false }).apply(compiler as any);
        await compiler.compile();

        const manifest = JSON.parse(compiler.asset('appshell.manifest.json') as string);

        expect(manifest.tokens.TestModule.required).toContain('primary');
      });
    });

    it('should publish the generated manifest after emit', async () => {
      jest.spyOn(fs, 'writeFileSync').mockImplementation();
      const plugin = new AppshellPlugin({ config, registry, publish: true });

      plugin.apply(compiler as any);
      await compiler.compile();

      expect(mocked.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          registry,
          name: 'webpack-plugin',
          version: expect.stringMatching(/^\d+\.\d+\.\d+/),
        }),
      );
      expect(errors).toHaveLength(0);
    });

    it('should request force when webpack runs in development mode', async () => {
      jest.spyOn(fs, 'writeFileSync').mockImplementation();
      compiler.options.mode = 'development';
      const plugin = new AppshellPlugin({ config, registry, publish: true });

      plugin.apply(compiler as any);
      await compiler.compile();

      expect(mocked.publish).toHaveBeenCalledWith(expect.objectContaining({ force: true }));
    });

    it('should not request force in production mode', async () => {
      jest.spyOn(fs, 'writeFileSync').mockImplementation();
      compiler.options.mode = 'production';
      const plugin = new AppshellPlugin({ config, registry, publish: true });

      plugin.apply(compiler as any);
      await compiler.compile();

      expect(mocked.publish).toHaveBeenCalledWith(expect.objectContaining({ force: false }));
    });

    it('should publish under the unscoped package name', () => {
      expect(AppshellPlugin.identify('packages/webpack-plugin').name).toEqual('webpack-plugin');
    });

    it('should activate the published version when an application is given', async () => {
      jest.spyOn(fs, 'writeFileSync').mockImplementation();
      const plugin = new AppshellPlugin({
        config,
        registry,
        publish: true,
        application: 'acme/dev',
      });

      plugin.apply(compiler as any);
      await compiler.compile();

      expect(mocked.activate).toHaveBeenCalledWith(
        registry,
        'acme/dev',
        'acme/widgets@1.0.0',
        undefined,
      );
    });

    it('should report a failed publish as a compilation error so watch mode survives', async () => {
      jest.spyOn(fs, 'writeFileSync').mockImplementation();
      mocked.publish.mockRejectedValue(new Error('403 forbidden'));

      const plugin = new AppshellPlugin({ config, registry, publish: true });

      plugin.apply(compiler as any);
      // Resolving at all is the assertion: a thrown error stops the build, where a
      // compilation error lets watch mode report it and carry on.
      await expect(compiler.compile()).resolves.toBeUndefined();

      expect(errors).toHaveLength(1);
      expect(errors[0].message).toMatch(/403 forbidden/);
    });
  });
});
