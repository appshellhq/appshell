/** @jest-environment jsdom */
import { AppshellComposition, AppshellManifest } from '@appshell/config';
import fetch, { enableFetchMocks } from 'jest-fetch-mock';
import { chainResolvers, inlineResolver, registryResolver } from '../src/resolvers';

enableFetchMocks();

const MANIFEST_URL = 'http://test.com/appshell.manifest.json';
const KEY = 'TestModule/TestComponent';

const manifest: AppshellManifest = {
  remotes: {
    [KEY]: {
      id: 'test-component',
      scope: 'TestModule',
      module: './TestComponent',
      manifestUrl: MANIFEST_URL,
      remoteEntryUrl: 'http://test.com/remoteEntry.js',
      metadata: { title: 'Test' },
    },
  },
  modules: { TestModule: { name: 'TestModule' } },
  vars: { TestModule: { ENV_VAR_A: 'Original value for A' } },
};

const composition: AppshellComposition = {
  applicationId: 'acme/dev',
  revision: 7,
  root: KEY,
  rootProps: {},
  index: { [KEY]: MANIFEST_URL },
  remotes: manifest.remotes,
  vars: manifest.vars,
};

beforeEach(() => {
  fetch.resetMocks();
});

describe('inlineResolver', () => {
  it('resolves without any network call', async () => {
    const resolution = await inlineResolver(composition)(KEY);

    expect(fetch).not.toHaveBeenCalled();
    expect(resolution?.remote).toEqual(manifest.remotes[KEY]);
    expect(resolution?.vars).toEqual({ ENV_VAR_A: 'Original value for A' });
  });

  it('yields to the next resolver when the key is absent', async () => {
    await expect(inlineResolver(composition)('Other/Key')).resolves.toBeUndefined();
    await expect(inlineResolver(undefined)(KEY)).resolves.toBeUndefined();
  });
});

describe('registryResolver', () => {
  it('fetches a remote activated after the page was served', async () => {
    const added = { ...manifest.remotes[KEY], scope: 'LateModule', module: './Late' };
    fetch.mockResponseOnce(JSON.stringify(added));

    const resolution = await registryResolver(composition, 'http://registry')('LateModule/Late');

    expect(fetch).toHaveBeenCalledWith(
      'http://registry/v1/applications/acme/dev/remotes/LateModule/Late',
      expect.anything(),
    );
    expect(resolution?.remote).toEqual(added);
  });

  it('yields to the next resolver when the registry has no such remote', async () => {
    fetch.mockResponseOnce('', { status: 404 });

    await expect(registryResolver(composition)('Nope/Nope')).resolves.toBeUndefined();
  });
});

describe('chainResolvers', () => {
  it('returns the first resolution and stops', async () => {
    const second = jest.fn();
    const resolve = chainResolvers(inlineResolver(composition), second);

    await resolve(KEY);

    expect(second).not.toHaveBeenCalled();
  });

  it('resolves undefined when no resolver matches', async () => {
    await expect(chainResolvers()('Nope/Nope')).resolves.toBeUndefined();
  });
});
