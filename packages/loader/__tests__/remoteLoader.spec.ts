/** @jest-environment jsdom */
import { AppshellComposition, AppshellRemote } from '@appshell/config';
import fetch, { enableFetchMocks } from 'jest-fetch-mock';
import * as loadAppshellComponent from '../src/loadAppshellComponent';
import remoteLoader from '../src/remoteLoader';

enableFetchMocks();

jest.mock('../src/loadAppshellComponent');

describe('remoteLoader', () => {
  const KEY = 'TestModule/TestComponent';

  const remote: AppshellRemote = {
    id: 'test-component',
    scope: 'TestModule',
    module: './TestComponent',
    manifestUrl: 'http://test.com/appshell.manifest.json',
    remoteEntryUrl: 'http://test.com/remoteEntry.js',
    metadata: {},
  };

  const composition: AppshellComposition = {
    applicationId: 'acme/dev',
    revision: 1,
    root: KEY,
    rootProps: {},
    index: { [KEY]: remote.manifestUrl },
    remotes: { [KEY]: remote },
    vars: { TestModule: { ENV_VAR_A: 'Composed value for A' } },
  };

  beforeEach(() => {
    fetch.resetMocks();
  });

  it('should return the remote from the inlined composition without fetching', async () => {
    const ExpectedComponent = () => 'test component';
    jest.spyOn(loadAppshellComponent, 'default').mockResolvedValue(ExpectedComponent);

    const loadRemote = remoteLoader({ composition });
    const [ActualComponent, actualRemote] = await loadRemote(KEY);

    expect(fetch).not.toHaveBeenCalled();
    expect(ActualComponent).toEqual(ExpectedComponent);
    expect(actualRemote).toEqual(remote);
  });

  it('should hand the composed vars to the remote', async () => {
    jest.spyOn(loadAppshellComponent, 'default').mockResolvedValue(() => 'test component');

    await remoteLoader({ composition })(KEY);

    // eslint-disable-next-line no-underscore-dangle
    expect(window.__appshell_vars__TestModule).toEqual({ ENV_VAR_A: 'Composed value for A' });
  });

  it('should fall back to the registry for a remote activated after the page was served', async () => {
    const added: AppshellRemote = { ...remote, scope: 'LateModule', module: './Late' };
    jest.spyOn(loadAppshellComponent, 'default').mockResolvedValue(() => 'late component');
    fetch.mockResponseOnce(JSON.stringify(added));

    const [, actualRemote] = await remoteLoader({ composition })('LateModule/Late');

    expect(fetch).toHaveBeenCalledWith(
      '/v1/applications/acme/dev/remotes/LateModule/Late',
      expect.anything(),
    );
    expect(actualRemote).toEqual(added);
  });

  it('should throw when neither the composition nor the registry has the remote', async () => {
    jest.spyOn(loadAppshellComponent, 'default').mockResolvedValue(() => 'test component');
    fetch.mockResponseOnce('', { status: 404 });

    await expect(remoteLoader({ composition })('TestModule/DoesNotExist')).rejects.toThrow(
      /Remote resource not found in registry/i,
    );
  });

  it('should throw when there is no composition at all', async () => {
    jest.spyOn(loadAppshellComponent, 'default').mockResolvedValue(() => 'test component');

    await expect(remoteLoader()(KEY)).rejects.toThrow(/Remote resource not found in registry/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should throw if loading the Appshell component fails', async () => {
    jest.spyOn(loadAppshellComponent, 'default').mockRejectedValue(new Error('failed'));

    await expect(remoteLoader({ composition })(KEY)).rejects.toThrow(/Failed to load component/i);
  });
});
