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
import { Compilation, container, WebpackOptionsNormalized } from 'webpack';
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

class MockCompiler {
  options: Partial<WebpackOptionsNormalized>;

  compilation: Partial<Compilation>;

  context = 'packages/webpack-plugin';

  handlers: Record<string, (compilation: Partial<Compilation>) => Promise<void>> = {};

  hooks = {
    afterEmit: {
      tapPromise: (
        name: string,
        callback: (compilation: Partial<Compilation>) => Promise<void>,
      ) => {
        this.handlers[name] = callback;
      },
    },
  };

  constructor(options: Partial<WebpackOptionsNormalized>, compilation: Partial<Compilation>) {
    this.options = options;
    this.compilation = compilation;
  }

  invokeHandlers() {
    return Promise.all(
      values(this.handlers).map((handler) => handler.call(null, this.compilation)),
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
    delete process.env.APPSHELL_ENVIRONMENT;
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

    it('should write configuration to configsDir', async () => {
      const writeFileSyncSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation();
      const plugin = new AppshellPlugin({ config });

      plugin.apply(compiler as any);
      await compiler.invokeHandlers();

      expect(writeFileSyncSpy).toHaveBeenCalledWith(
        expect.anything(),
        JSON.stringify(sampleConfig),
      );
    });

    it('should not publish outside development mode unless asked', async () => {
      jest.spyOn(fs, 'writeFileSync').mockImplementation();
      const plugin = new AppshellPlugin({ config, registry });

      plugin.apply(compiler as any);
      await compiler.invokeHandlers();

      expect(mocked.publish).not.toHaveBeenCalled();
    });

    it('should publish by default in development mode', async () => {
      jest.spyOn(fs, 'writeFileSync').mockImplementation();
      mocked.resolveContext.mockReturnValue({ scopeId: 'default', registry });
      compiler.options.mode = 'development';
      const plugin = new AppshellPlugin({ config });

      plugin.apply(compiler as any);
      await compiler.invokeHandlers();

      expect(mocked.publish).toHaveBeenCalledWith(
        expect.objectContaining({ registry, force: true }),
      );
    });

    it('should resolve the registry from the CLI context', async () => {
      jest.spyOn(fs, 'writeFileSync').mockImplementation();
      mocked.resolveContext.mockReturnValue({ scopeId: 'default', registry });
      const plugin = new AppshellPlugin({ config, publish: true });

      plugin.apply(compiler as any);
      await compiler.invokeHandlers();

      expect(mocked.publish).toHaveBeenCalledWith(expect.objectContaining({ registry }));
    });

    it('should skip publish in development when no registry is configured', async () => {
      jest.spyOn(fs, 'writeFileSync').mockImplementation();
      compiler.options.mode = 'development';
      const plugin = new AppshellPlugin({ config });

      plugin.apply(compiler as any);
      await compiler.invokeHandlers();

      expect(mocked.publish).not.toHaveBeenCalled();
      expect(errors).toHaveLength(0);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringMatching(/no registry configured/i));
    });

    it('should warn when an option overrides the persisted CLI context', async () => {
      jest.spyOn(fs, 'writeFileSync').mockImplementation();
      mocked.persistedContext.mockReturnValue({ registry: 'https://persisted.example.com' });
      const plugin = new AppshellPlugin({ config, registry, publish: true });

      plugin.apply(compiler as any);
      await compiler.invokeHandlers();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringMatching(/overriding your CLI context/i),
      );
    });

    it('should fail before building when publishing without a registry', () => {
      const plugin = new AppshellPlugin({ config, publish: true });

      expect(() => plugin.apply(compiler as any)).toThrowError(/no registry was given/i);
    });

    it('should publish the generated manifest after emit', async () => {
      jest.spyOn(fs, 'writeFileSync').mockImplementation();
      const plugin = new AppshellPlugin({ config, registry, publish: true });

      plugin.apply(compiler as any);
      await compiler.invokeHandlers();

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
      await compiler.invokeHandlers();

      expect(mocked.publish).toHaveBeenCalledWith(expect.objectContaining({ force: true }));
    });

    it('should not request force in production mode', async () => {
      jest.spyOn(fs, 'writeFileSync').mockImplementation();
      compiler.options.mode = 'production';
      const plugin = new AppshellPlugin({ config, registry, publish: true });

      plugin.apply(compiler as any);
      await compiler.invokeHandlers();

      expect(mocked.publish).toHaveBeenCalledWith(expect.objectContaining({ force: false }));
    });

    it('should publish under the unscoped package name', () => {
      expect(AppshellPlugin.identify('packages/webpack-plugin').name).toEqual('webpack-plugin');
    });

    it('should activate the published version when an environment is given', async () => {
      jest.spyOn(fs, 'writeFileSync').mockImplementation();
      const plugin = new AppshellPlugin({
        config,
        registry,
        publish: true,
        environment: 'acme/dev',
      });

      plugin.apply(compiler as any);
      await compiler.invokeHandlers();

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
      await expect(compiler.invokeHandlers()).resolves.toBeDefined();

      expect(errors).toHaveLength(1);
      expect(errors[0].message).toMatch(/403 forbidden/);
    });
  });
});
