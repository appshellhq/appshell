/* eslint-disable @typescript-eslint/no-explicit-any */
import { activate, generateManifest, publish } from '@appshell/config';
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
}));

const mocked = {
  activate: activate as jest.MockedFunction<typeof activate>,
  generateManifest: generateManifest as jest.MockedFunction<typeof generateManifest>,
  publish: publish as jest.MockedFunction<typeof publish>,
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

  beforeEach(() => {
    const plugins = [new container.ModuleFederationPlugin(MODULE_FEDERATION_PLUGIN_OPTIONS)];
    errors = [];
    compiler = new MockCompiler(
      { plugins },
      {
        outputOptions: { path: '' },
        errors: errors as any,
        getLogger: (() => ({ info: jest.fn() })) as any,
      },
    );

    mocked.generateManifest.mockResolvedValue({ remotes: {} } as any);
    mocked.publish.mockResolvedValue({ id: 'acme/widgets@1.0.0', created: true });
    mocked.activate.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    delete process.env.APPSHELL_PUBLISH_ON_BUILD;
    delete process.env.APPSHELL_REGISTRY_URL;
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

    it('should not publish unless asked', () => {
      expect(new AppshellPlugin().options.publish).toBe(false);
    });

    it('should opt in via APPSHELL_PUBLISH_ON_BUILD', () => {
      process.env.APPSHELL_PUBLISH_ON_BUILD = '1';
      process.env.APPSHELL_REGISTRY_URL = registry;

      const plugin = new AppshellPlugin();

      expect(plugin.options.publish).toBe(true);
      expect(plugin.options.registry).toEqual(registry);
    });

    it('should let explicit options win over the environment', () => {
      process.env.APPSHELL_PUBLISH_ON_BUILD = '1';

      expect(new AppshellPlugin({ publish: false }).options.publish).toBe(false);
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

    it('should not publish by default', async () => {
      jest.spyOn(fs, 'writeFileSync').mockImplementation();
      const plugin = new AppshellPlugin({ config, registry });

      plugin.apply(compiler as any);
      await compiler.invokeHandlers();

      expect(mocked.publish).not.toHaveBeenCalled();
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
