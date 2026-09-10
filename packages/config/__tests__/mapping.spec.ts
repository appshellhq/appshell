import { entries, values } from 'lodash';
import configmap from '../src/configmap';
import { toAppshellManifest } from '../src/mappers';
import { AppshellManifest, AppshellTemplate } from '../src/types';
import template from './assets/appshell.template.json';

describe('mapping configurations to domain objects', () => {
  const APPS_TEST_URL = 'http://remote-endpoint.com';
  const APPS_TEST_REMOTE_ENTRY_PATH = 'remoteEntry.js';
  const RUNTIME_ENV = 'development';
  const RUNTIME_ENV_VERSION = '1.0.0';

  let appshellManifest: AppshellManifest;
  beforeEach(() => {
    process.env.APPS_TEST_URL = APPS_TEST_URL;
    process.env.APPS_TEST_REMOTE_ENTRY_PATH = APPS_TEST_REMOTE_ENTRY_PATH;
    process.env.RUNTIME_ENV = RUNTIME_ENV;
    process.env.RUNTIME_ENV_VERSION = RUNTIME_ENV_VERSION;
    const configMap = configmap.create(template as AppshellTemplate);
    appshellManifest = toAppshellManifest(template as AppshellTemplate, configMap);
  });

  it('should match snapshot', () => {
    expect(appshellManifest).toMatchSnapshot();
  });

  /*
   * The mapped manifest describes the artifact and nothing about where it is served.
   * It used to build manifestUrl and remoteEntryUrl from a `url` in the yaml, which froze
   * the building environment into an immutable version; the registry composes both from
   * the package's address and its own serving plane instead.
   */
  it('should carry no origin', () => {
    const remotes = values(appshellManifest.components);

    expect(remotes.every((remote) => !('manifestUrl' in remote))).toBe(true);
    expect(remotes.every((remote) => !('remoteEntryUrl' in remote))).toBe(true);
    expect(JSON.stringify(appshellManifest)).not.toContain(APPS_TEST_URL);
  });

  it('should name the entry file the build emits', () => {
    expect(
      values(appshellManifest.components).every((remote) => remote.loader.filename),
    ).toBeTruthy();
  });

  it('should create the scope value from the remote key', () => {
    expect(
      entries(appshellManifest.components).every(([key, remote]) =>
        key.includes(remote.loader.scope),
      ),
    ).toBeTruthy();
  });

  it('should create the module value from the remote key', () => {
    expect(
      entries(appshellManifest.components).every(([key, remote]) => {
        const moduleName = key.replace(/\/.+/, '');
        const moduleKey = key.replace(moduleName, '.');

        return moduleKey === remote.loader.module;
      }),
    ).toBeTruthy();
  });

  it('should map shareScope to manifest remote', () => {
    expect(
      values(appshellManifest.components).every((remote) => remote.loader.shareScope),
    ).toBeTruthy();
  });
});

/*
 * The keying and the array-form skip used to live in the registry, reduced out of the
 * Module Federation plugin options the manifest carried verbatim. The manifest states the
 * contract directly now, so the logic that builds it lives here.
 */
describe('the shared contract', () => {
  const manifestOf = (module: Record<string, unknown>) =>
    toAppshellManifest({ components: {}, module } as unknown as AppshellTemplate, {});

  it('keys what is shared by its share scope', () => {
    const manifest = manifestOf({
      name: 'M',
      shareScope: 'legacy',
      shared: { react: { requiredVersion: '^17.0.0' } },
    });

    expect(manifest.shared?.scopes).toEqual({ legacy: { react: { requiredVersion: '^17.0.0' } } });
  });

  it('defaults the scope when the build names none', () => {
    const manifest = manifestOf({ name: 'M', shared: { react: { singleton: true } } });

    expect(manifest.shared?.scopes).toEqual({ default: { react: { singleton: true } } });
  });

  it('says which framework the contract belongs to', () => {
    const manifest = manifestOf({ name: 'M', shared: { react: { singleton: true } } });

    expect(manifest.shared).toMatchObject({
      apiVersion: 'federation.appshell.org/v1',
      kind: 'ModuleFederation',
    });
  });

  // Names with no version constraint say nothing about compatibility, so there is nothing
  // for the registry to check and no contract to state.
  it('states no contract for the array form', () => {
    expect(manifestOf({ name: 'M', shared: ['react'] }).shared).toBeUndefined();
  });

  it('states no contract when a package shares nothing', () => {
    expect(manifestOf({ name: 'M' }).shared).toBeUndefined();
  });
});
