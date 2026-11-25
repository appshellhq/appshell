import fs from 'fs';
import yaml from 'yaml';
import yargs from 'yargs';
import { CliConfig } from '../src/types';
import { mergeConfigWithArgs, readConfig, writeConfig } from '../src/utils/config';

jest.mock('fs');
jest.mock('yaml');

describe('config', () => {
  describe('readConfig', () => {
    it('should read and parse the YAML file correctly', () => {
      const configPath = '/path/to/config.yaml';
      const configFileContent = `
        api-key: my-api-key
        registry: http://test.appshell.com
      `;
      const expectedConfig = {
        'api-key': 'my-api-key',
        registry: 'http://test.appshell.com',
      };

      const existsSyncSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      const readFileSyncSpy = jest.spyOn(fs, 'readFileSync').mockReturnValue(configFileContent);
      const yamlParseSpy = jest.spyOn(yaml, 'parse').mockReturnValue(expectedConfig);

      const result = readConfig(configPath);

      expect(existsSyncSpy).toHaveBeenCalledWith(configPath);
      expect(readFileSyncSpy).toHaveBeenCalledWith(configPath, 'utf-8');
      expect(yamlParseSpy).toHaveBeenCalledWith(configFileContent);
      expect(result).toEqual({
        apiKey: expectedConfig['api-key'],
        registry: expectedConfig.registry,
      });
    });

    it('should return an empty config when the YAML parser returns null', () => {
      const configPath = '/path/to/config.yaml';

      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'readFileSync').mockReturnValue('');
      jest.spyOn(yaml, 'parse').mockReturnValue(null as unknown as CliConfig);

      const result = readConfig(configPath);

      expect(result).toEqual({});
    });
  });

  describe('writeConfig', () => {
    it('should write the config object to the YAML file', () => {
      const configPath = '/path/to/config.yaml';
      const config = {
        apiKey: 'my-api-key',
        registry: 'http://test.appshell.com',
      };
      const expectedConfigFileContent = `
        api-key: my-api-key
        registry: http://test.appshell.com
      `;
      jest.spyOn(yaml, 'stringify').mockReturnValue(expectedConfigFileContent);

      const writeFileSyncMock = jest.spyOn(fs, 'writeFileSync');

      writeConfig(configPath, config);

      expect(writeFileSyncMock).toHaveBeenCalledWith(configPath, expectedConfigFileContent);
    });
  });

  describe('mergeConfigWithArgs', () => {
    const initialArgv = {
      $0: 'node_modules/jest-worker/build/workers/processChild.js',
      _: [],
      apiKey: 'my-api-key',
      registry: 'http://test.appshell.com',
    } as yargs.ArgumentsCamelCase;
    let consoleDebugSpy: jest.SpyInstance;
    beforeEach(() => {
      consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should merge config with args and update argv', () => {
      const config: CliConfig = {
        registry: 'http://test.appshell.com',
        apiKey: 'my-api-key',
        key1: 'value1',
        key2: 'value2',
      };
      const argv = { ...initialArgv };
      mergeConfigWithArgs(config, argv);

      expect(consoleDebugSpy).toHaveBeenCalledWith('Merging config with args...');
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        'Parsing args: --registry http://test.appshell.com --apiKey my-api-key --key1 value1 --key2 value2 ',
      );
      expect(consoleDebugSpy).toHaveBeenCalledWith('Parsed args: ', {
        ...argv,
        key1: 'value1',
        key2: 'value2',
      });
      expect(consoleDebugSpy).toHaveBeenCalledWith('Final argv: ', argv);
    });

    it('should not override existing argv values when merging', () => {
      const config: CliConfig = {
        registry: 'http://test.appshell.com',
        apiKey: 'my-api-key',
        key1: 'value1',
        key2: 'value2',
      };
      const argv = { ...initialArgv, key1: 'existing value' };
      mergeConfigWithArgs(config, argv);

      expect(consoleDebugSpy).toHaveBeenCalledWith('Merging config with args...');
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        'Parsing args: --registry http://test.appshell.com --apiKey my-api-key --key1 value1 --key2 value2 ',
      );
      expect(consoleDebugSpy).toHaveBeenLastCalledWith('Final argv: ', {
        ...argv,
        key1: 'existing value',
      });
    });
  });
});
