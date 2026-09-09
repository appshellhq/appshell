import { keys, values } from 'lodash';
import path from 'path';
import generate from '../src/generate.manifest';
import manifest from './assets/appshell.manifest.json';

type TestMetadata = {
  route: string;
  displayName: string;
  displayGroup: string;
  order: number;
  icon: string;
};

describe('generate', () => {
  const packageName = 'config';

  beforeAll(() => {
    process.env.REGISTRY = 'packages/cli/__tests__/assets/appshell_registry';
    process.env.ROOT = 'TestModule/Workspace';
    // The fixture's deployment coordinates. Publishing now refuses to emit a manifest with
    // one unresolved, where it used to spell `undefined` into the URL and carry on.
    process.env.APPS_TEST_URL = 'http://remote-module.com';
    process.env.APPS_TEST_REMOTE_ENTRY_PATH = 'remoteEntry.js';
    process.env.TEST_ENV_FOO = 'foo';
    process.env.TEST_ENV_BAR = 'bar';
    process.env.TEST_NUM = '100';
  });

  afterAll(() => {
    delete process.env.REGISTRY;
    delete process.env.APPS_TEST_URL;
    delete process.env.APPS_TEST_REMOTE_ENTRY_PATH;
    delete process.env.ROOT;
    delete process.env.TEST_ENV_FOO;
    delete process.env.TEST_ENV_BAR;
    delete process.env.TEST_NUM;
  });

  describe('manifest', () => {
    const configTemplate = path.resolve(
      `packages/${packageName}/__tests__/assets/appshell.template.json`,
    );

    process.env.APPS_TEST_URL = 'http://remote-module.com/remoteEntry.js';
    process.env.RUNTIME_ENV = 'development';
    process.env.RUNTIME_ENV_VERSION = '1.0.0';

    it('should generate an appshell manifest from the config template', async () => {
      const config = await generate(configTemplate);

      expect(config).toMatchSnapshot();
    });

    it('should produce null when config is available to process', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const config = await generate(undefined as any);

      expect(config).toBeNull();
    });

    it('should contain all remotes', async () => {
      const config = await generate(configTemplate);
      const expectedRemotes = keys(manifest.remotes);
      const actualRemotes = keys(config?.remotes);

      expect(expectedRemotes).toEqual(actualRemotes);
    });

    // Where a bundle is served from is the deployment's to say, so nothing the build
    // writes may name an origin — see the mapper.
    it('should generate remotes that name no origin', async () => {
      const config = await generate(configTemplate);
      const remotes = values(config?.remotes);

      expect(remotes.length).toBeGreaterThan(0);
      expect(remotes.every((remote) => !('manifestUrl' in remote))).toBe(true);
      expect(remotes.every((remote) => !('remoteEntryUrl' in remote))).toBe(true);
    });

    it('should capture metadata', async () => {
      const config = await generate<TestMetadata>(configTemplate);

      expect(values(config?.remotes).flatMap((remote) => remote.metadata)).toHaveLength(3);
    });
  });
});
