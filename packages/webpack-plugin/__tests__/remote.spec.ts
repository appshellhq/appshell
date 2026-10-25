import AppshellPlugin from '../src/AppshellPlugin';
import { appshellRemote, type AppshellRemoteOptions } from '../src/remote';
import { appshellShared } from '../src/shared';

// The real plugin validates against a compiler; what's under test is what the factory asks of it.
jest.mock('@module-federation/enhanced/webpack', () => ({
  ModuleFederationPlugin: jest
    .fn()
    .mockImplementation(function plugin(this: { options: unknown }, options: unknown) {
      this.options = options;
    }),
}));

const options = (overrides: Partial<AppshellRemoteOptions> = {}): AppshellRemoteOptions => ({
  name: 'PackagesModule',
  exposes: { './Packages': './src/Packages' },
  port: 7302,
  mode: 'production',
  ...overrides,
});

const federation = (config: ReturnType<typeof appshellRemote>) =>
  (config.plugins?.[0] as unknown as { options: Record<string, unknown> }).options;

describe('appshellRemote', () => {
  // The registry serves the shell page under a CSP that forbids eval(), which development's
  // default source maps use.
  it('should make source maps without eval in development, and none in production', () => {
    expect(appshellRemote(options({ mode: 'development' })).devtool).toBe('source-map');
    expect(appshellRemote(options({ mode: 'production' })).devtool).toBe(false);
  });

  // Served under /p/<scope>/<name>/<version>/ on the application's origin, or by a dev server
  // through an overlay: the path is known only once the remote entry loads.
  it('should resolve its own files from wherever its entry was loaded', () => {
    expect(appshellRemote(options()).output?.publicPath).toBe('auto');
  });

  it('should hash every chunk by its bytes, and keep the entry the manifest names', () => {
    const config = appshellRemote(options());

    expect(config.output).toMatchObject({
      filename: '[name].[contenthash].js',
      chunkFilename: '[name].[contenthash].js',
    });
    expect(federation(config).filename).toBe('remoteEntry.js');
  });

  it('should keep its chunks apart from other remotes, by its name unless told otherwise', () => {
    expect(appshellRemote(options()).output?.uniqueName).toBe('PackagesModule');
    expect(appshellRemote(options({ uniqueName: 'appshell-packages' })).output?.uniqueName).toBe(
      'appshell-packages',
    );
  });

  it('should build from the first module it exposes, unless given an entry', () => {
    expect(appshellRemote(options()).entry).toBe('./src/Packages');
    expect(appshellRemote(options({ entry: './src/index' })).entry).toBe('./src/index');
  });

  describe('its dev server', () => {
    it('should answer a shell on another origin, and give it a reload socket it can dial', () => {
      expect(appshellRemote(options()).devServer).toMatchObject({
        port: 7302,
        headers: { 'Access-Control-Allow-Origin': '*' },
        client: { webSocketURL: 'ws://localhost:7302/ws' },
      });
    });

    it("should let any page open its reload socket, unless told the application's hosts", () => {
      expect(appshellRemote(options()).devServer.allowedHosts).toBe('all');
      expect(
        appshellRemote(options({ allowedHosts: ['.appshell.org'] })).devServer.allowedHosts,
      ).toEqual(['.appshell.org']);
    });

    // A dependency's warning, or an error thrown by a browser extension, shouldn't cover the
    // view a developer is trying.
    it('should cover the page only for its own build errors', () => {
      expect(appshellRemote(options()).devServer.client).toMatchObject({
        overlay: { errors: true, warnings: false, runtimeErrors: false },
      });
    });
  });

  describe('federation', () => {
    it('should expose what it was given, under its name, without generating types', () => {
      expect(federation(appshellRemote(options()))).toMatchObject({
        name: 'PackagesModule',
        exposes: { './Packages': './src/Packages' },
        dts: false,
      });
    });

    it("should share appshell's preset, with React when asked, pinned to the package's ranges", () => {
      const dependencies = { react: '19.3.1', 'react-dom': '19.3.1' };

      expect(federation(appshellRemote(options({ react: true, dependencies }))).shared).toEqual(
        appshellShared({ react: true, dependencies }),
      );
      expect(federation(appshellRemote(options())).shared).toEqual(appshellShared());
    });

    // A container's own contract, such as the workspace's router, is the author's to add.
    it('should share what the author adds, after the preset', () => {
      const shared = { 'react-router': { singleton: true, requiredVersion: '^8.4.0' } };

      expect(federation(appshellRemote(options({ shared }))).shared).toEqual(
        appshellShared({ extra: shared }),
      );
    });
  });

  it('should write the manifest a publish sends, with the options it was given', () => {
    const config = appshellRemote(options({ plugin: { publish: false } }));
    const plugin = config.plugins?.[1] as AppshellPlugin;

    expect(plugin).toBeInstanceOf(AppshellPlugin);
    expect(plugin.options).toMatchObject({ publish: false });
  });

  // appshellhq/appshell#72: @appshell/react's bundled federation runtime imports from a URL known
  // only at runtime, which webpack warns about in every build that bundles it.
  it("should quiet only the federation runtime's warning, from only @appshell/react", () => {
    const [ignored] = appshellRemote(options()).ignoreWarnings as {
      module: RegExp;
      message: RegExp;
    }[];
    const warning = 'Critical dependency: the request of a dependency is an expression';

    expect(ignored.module.test('../../node_modules/@appshell/react/dist/main.js')).toBe(true);
    expect(ignored.module.test('node_modules\\@appshell\\react\\dist\\main.js')).toBe(true);
    expect(ignored.module.test('../../node_modules/some-library/dist/main.js')).toBe(false);
    expect(ignored.message.test(warning)).toBe(true);
    expect(ignored.message.test('Module not found')).toBe(false);
  });
});
