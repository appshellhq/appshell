import fs from 'fs';
import * as config from '../../config/src/utils/config';
import init, { InitArgs } from '../src/handlers/config/init';

jest.mock('fs');
jest.mock('../../config/src/utils/config');

describe('config init', () => {
  const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  const existsSyncSpy = jest.spyOn(fs, 'existsSync');
  const mkdirSyncSpy = jest.spyOn(fs, 'mkdirSync');
  const readConfigSpy = jest.spyOn(config, 'readConfig');
  const writeConfigSpy = jest.spyOn(config, 'writeConfig');

  beforeEach(() => {
    jest.clearAllMocks();
    readConfigSpy.mockReturnValue({} as never);
  });

  it('should initialize with default values if none are provided', async () => {
    const args: InitArgs = { config: 'defaultConfig' };

    existsSyncSpy.mockReturnValue(false);

    await init(args);

    expect(existsSyncSpy).toHaveBeenCalledWith(args.config);
    expect(mkdirSyncSpy).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    expect(writeConfigSpy).toHaveBeenCalledWith(args.config, {
      registry: 'http://localhost:7150',
      environment: 'default',
      scopeId: 'default',
      authIssuer: '',
      clientId: 'appshell-cli',
    });
  });

  it('should prefer provided values over existing ones', async () => {
    const args: InitArgs = {
      config: 'testConfig',
      registry: 'https://registry.example.com',
      environment: 'staging',
    };

    existsSyncSpy.mockReturnValue(true);
    readConfigSpy.mockReturnValue({
      registry: 'https://old.example.com',
      environment: 'old',
      scopeId: 'acme',
    } as never);

    await init(args);

    expect(mkdirSyncSpy).not.toHaveBeenCalled();
    expect(writeConfigSpy).toHaveBeenCalledWith(args.config, {
      registry: 'https://registry.example.com',
      environment: 'staging',
      scopeId: 'acme',
      authIssuer: '',
      clientId: 'appshell-cli',
    });
  });

  it('should surface errors to the caller', async () => {
    const error = new Error('test error');
    existsSyncSpy.mockImplementation(() => {
      throw error;
    });

    await expect(init({ config: 'testConfig' })).rejects.toThrow('test error');
    expect(consoleLogSpy).not.toHaveBeenCalledWith(
      'Error initializing appshell cli configuration:',
      error.message,
    );
  });
});
