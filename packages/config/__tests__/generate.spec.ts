import { keys, values } from 'lodash';
import path from 'path';
import generateEnv from '../src/generate.env';
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
    process.env.TEST_ENV_FOO = 'foo';
    process.env.TEST_ENV_BAR = 'bar';
    process.env.TEST_NUM = '100';
  });

  afterAll(() => {
    delete process.env.REGISTRY;
    delete process.env.ROOT;
    delete process.env.TEST_ENV_FOO;
    delete process.env.TEST_ENV_BAR;
    delete process.env.TEST_NUM;
  });

  describe('runtime env file', () => {
    it('should generate the runtime environment js file', async () => {
      const application = await generateEnv('^(TEST_|REGISTRY|ROOT).*');

      expect(Object.fromEntries(application)).toStrictEqual({
        REGISTRY: 'packages/cli/__tests__/assets/appshell_registry',
        ROOT: 'TestModule/Workspace',
        TEST_ENV_FOO: 'foo',
        TEST_ENV_BAR: 'bar',
        TEST_NUM: '100',
      });
    });

    it('should capture only prefixed environment vars when prefix is supplied', async () => {
      const application = await generateEnv('TEST_');

      expect(Object.fromEntries(application)).toStrictEqual({
        TEST_ENV_FOO: 'foo',
        TEST_ENV_BAR: 'bar',
        TEST_NUM: '100',
      });
    });
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

    it('should apply environment variables to configuration', async () => {
      const config = await generate(configTemplate);

      const actualUrls = values(config?.remotes).flatMap((remote) => remote.manifestUrl);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expect(actualUrls.some((url) => url.includes(process.env.APPS_TEST_URL!))).toBeTruthy();
    });

    it('should capture metadata', async () => {
      const config = await generate<TestMetadata>(configTemplate);

      expect(values(config?.remotes).flatMap((remote) => remote.metadata)).toHaveLength(3);
    });
  });
});
