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
    // No application, no scope and no issuer: none of them has a default anybody chose,
    // and writing one made a placeholder look like a decision. See the sibling spec.
    expect(writeConfigSpy).toHaveBeenCalledWith(args.config, {
      registry: 'http://localhost:7150',
      clientId: 'appshell-cli',
    });
  });

  it('should prefer provided values over existing ones', async () => {
    const args: InitArgs = {
      config: 'testConfig',
      registry: 'https://registry.example.com',
      application: 'staging',
    };

    existsSyncSpy.mockReturnValue(true);
    readConfigSpy.mockReturnValue({
      registry: 'https://old.example.com',
      application: 'old',
      scopeId: 'acme',
    } as never);

    await init(args);

    expect(mkdirSyncSpy).not.toHaveBeenCalled();
    // What the file already held is kept; only what nothing supplies is left out.
    expect(writeConfigSpy).toHaveBeenCalledWith(args.config, {
      registry: 'https://registry.example.com',
      application: 'staging',
      scopeId: 'acme',
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
