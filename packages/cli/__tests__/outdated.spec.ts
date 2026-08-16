import * as config from '@appshell/config';
import { ComparisonResults, SharedObject } from '../../config/src/types';
import handler from '../src/handlers/outdated';
import * as util from '../src/util/fetch';
import outdatedResults from './assets/outdated.results.json';
import packageSpec from './assets/package.json';
import snapshot from './assets/snapshot.json';

jest.mock('../src/util/fetch');

const sharedModules = Object.entries(snapshot.modules).reduce((acc, [name, options]) => {
  acc[name] = options.shared as SharedObject;
  return acc;
}, {} as Record<string, SharedObject>);

describe('cli outdated', () => {
  const apiKey = 'test-api-key';
  const apiKeyHeader = 'test-api-key-header';
  const environment = 'test-env';
  const scopeId = 'test-scope';
  const testResults = outdatedResults as ComparisonResults;
  let fetchPackageSpecSpy: jest.SpyInstance;
  let fetchSharedModulesSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  beforeEach(() => {
    fetchPackageSpecSpy = jest.spyOn(util, 'fetchPackageSpec').mockResolvedValue(packageSpec);
    fetchSharedModulesSpy = jest.spyOn(util, 'fetchSharedModules').mockResolvedValue(sharedModules);
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  it('should throw if package.json not found', async () => {
    const workingDir = 'does/not/exist';
    const registry = 'http://test.appshell.com';
    const errorMessage = `Package spec not found at ${workingDir}/package.json`;
    fetchPackageSpecSpy.mockRejectedValueOnce(new Error(errorMessage));

    await handler({
      apiKey,
      apiKeyHeader,
      workingDir,
      registry,
      environment,
      scopeId,
      manager: 'npm',
    });

    expect(fetchPackageSpecSpy).toHaveBeenCalledWith(workingDir, apiKey, apiKeyHeader);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      `Error analyzing outdated shared dependencies`,
      errorMessage,
    );
  });

  it('should fetch shared modules from a valid URL', async () => {
    const workingDir = '/path/to/workingDir';
    const registry = 'http://test.appshell.com';
    const modulesToCheck = Object.keys(sharedModules).length;
    const outdatedSpy = jest.spyOn(config, 'outdated').mockResolvedValue(testResults);

    await handler({
      apiKey,
      apiKeyHeader,
      workingDir,
      registry,
      environment,
      scopeId,
      manager: 'npm',
    });

    expect(outdatedSpy).toHaveBeenCalledTimes(modulesToCheck);
    expect(fetchPackageSpecSpy).toHaveBeenCalledWith(workingDir, apiKey, apiKeyHeader);
    expect(fetchSharedModulesSpy).toHaveBeenCalledWith(
      registry,
      environment,
      scopeId,
      apiKey,
      apiKeyHeader,
    );
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should fetch shared modules from a local directory', async () => {
    const workingDir = '/path/to/workingDir';
    const registry = '/path/to/registry';
    const modulesToCheck = Object.keys(sharedModules).length;
    const outdatedSpy = jest.spyOn(config, 'outdated').mockResolvedValue(testResults);

    await handler({
      apiKey,
      apiKeyHeader,
      workingDir,
      registry,
      environment,
      scopeId,
      manager: 'npm',
    });

    expect(outdatedSpy).toHaveBeenCalledTimes(modulesToCheck);
    expect(fetchPackageSpecSpy).toHaveBeenCalledWith(workingDir, apiKey, apiKeyHeader);
    expect(fetchSharedModulesSpy).toHaveBeenCalledWith(
      registry,
      environment,
      scopeId,
      apiKey,
      apiKeyHeader,
    );
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should throw an error if shared deps fetch fails', async () => {
    const workingDir = '/path/to/workingDir';
    const registry = 'http://test.appshell.com';
    fetchSharedModulesSpy.mockRejectedValueOnce(new Error('Shared deps fetch failed'));

    await handler({
      apiKey,
      apiKeyHeader,
      workingDir,
      registry,
      environment,
      scopeId,
      manager: 'npm',
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error analyzing outdated shared dependencies',
      'Shared deps fetch failed',
    );
  });

  it('should handle and log errors', async () => {
    const workingDir = '/path/to/workingDir';
    const registry = 'http://test.appshell.com';
    fetchSharedModulesSpy.mockRejectedValueOnce(new Error('Shared deps fetch failed'));

    await handler({
      apiKey,
      apiKeyHeader,
      workingDir,
      registry,
      environment,
      scopeId,
      manager: 'npm',
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error analyzing outdated shared dependencies',
      expect.anything(),
    );
  });
});
