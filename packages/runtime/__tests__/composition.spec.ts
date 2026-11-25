/**
 * @jest-environment jsdom
 */
/* eslint-disable no-underscore-dangle, @typescript-eslint/naming-convention */
import { getBasePath, getRemotes } from '../src/composition';
import { MissingCompositionError } from '../src/errors';

const inlined = (value: unknown) => {
  (window as unknown as Record<string, unknown>).__appshell_config__ = value;
};

const remote = (route: string) => ({
  id: 'a1b2c3d4',
  manifestUrl: 'https://apps.example/p/appshell/ping/1.0.0/appshell.manifest.json',
  remoteEntryUrl: 'https://apps.example/p/appshell/ping/1.0.0/remoteEntry.js',
  loader: {
    apiVersion: 'federation.appshell.org/v1',
    kind: 'ModuleFederation',
    scope: 'PingModule',
    module: './Ping',
    filename: 'remoteEntry.js',
  },
  metadata: { route, displayName: 'Ping', displayGroup: 'primary' },
});

// The shape the registry inlines, with the fields a container shouldn't reach for.
const composition = {
  applicationId: 'appshell/console',
  revision: 3,
  basePath: '/',
  root: 'appshell/workspace/Workspace',
  rootProps: {},
  index: {},
  remotes: { 'appshell/ping/Ping': remote('/ping') },
  vars: { PingModule: { GREETING: 'hi' } },
};

describe('the composition', () => {
  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).__appshell_config__;
  });

  describe('getRemotes', () => {
    it('returns every remote, keyed as RemoteSlot mounts it, with its metadata', () => {
      inlined(composition);

      expect(getRemotes()).toEqual({ 'appshell/ping/Ping': remote('/ping') });
    });

    it('types the metadata as the caller says', () => {
      inlined(composition);

      const remotes = getRemotes<{ route: string; displayName: string }>();

      expect(remotes['appshell/ping/Ping'].metadata.route).toBe('/ping');
    });

    it('returns an application with no remotes as empty, not as missing', () => {
      inlined({ ...composition, remotes: {} });

      expect(getRemotes()).toEqual({});
    });
  });

  describe('getBasePath', () => {
    it.each([
      ['an application mounted at the root of its own host', '/'],
      ['one on the shared serving plane', '/a/appshell/appshell-example'],
      ['one mounted at a path on its own host', '/console'],
    ])('returns the path the registry sent for %s', (_case, basePath) => {
      inlined({ ...composition, basePath });

      expect(getBasePath()).toBe(basePath);
    });

    it.each([
      ['absent, as from a registry before it sent one', undefined],
      ['not a string', 42],
      ['not a path', 'console'],
    ])('is the root when the base path is %s', (_case, basePath) => {
      inlined({ ...composition, basePath });

      expect(getBasePath()).toBe('/');
    });
  });

  describe('throws rather than returning an empty composition', () => {
    it('when the registry inlined nothing', () => {
      expect(() => getRemotes()).toThrow(MissingCompositionError);
      expect(() => getBasePath()).toThrow(MissingCompositionError);
    });

    it.each([
      ['a string', 'composition'],
      ['null', null],
      ['an array', []],
      ['an object with no remotes', { root: 'appshell/workspace/Workspace' }],
      ['remotes that are an array', { remotes: [] }],
      ['remotes that are null', { remotes: null }],
    ])('when the global is %s', (_case, value) => {
      inlined(value);

      expect(() => getRemotes()).toThrow(MissingCompositionError);
    });
  });
});
