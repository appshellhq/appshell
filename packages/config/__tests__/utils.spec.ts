import fs from 'fs';
import path from 'path';
import { blur } from '../src/utils';
import copy from '../src/utils/copy';
import load from '../src/utils/load';

describe('utils', () => {
  const packageName = 'config';

  describe('blur', () => {
    it('should return a blurred value', () => {
      const token = 'test-token';

      expect(blur(token)).toBe('test-...token');
    });
  });

  describe('load', () => {
    describe('consuming the configuration', () => {
      test('should read and parse the configuration file', () => {
        const file = path.resolve(`packages/${packageName}/__tests__/assets/appshell.config.yaml`);
        const config = load(file);

        expect(config).toMatchSnapshot();
      });

      test('should reject configuration file cannot be found', () => {
        const file = path.resolve(
          `packages/${packageName}/__tests__/assets/does_not_exist.config.yaml`,
        );

        expect(() => load(file)).toThrow(/Config file does not exist/);
      });
    });
  });

  describe('load', () => {
    describe('consuming the configuration', () => {
      test('should read and parse the configuration file', () => {
        const file = path.resolve(`packages/${packageName}/__tests__/assets/appshell.config.yaml`);
        const config = load(file);

        expect(config).toMatchSnapshot();
      });

      test('should reject configuration file cannot be found', () => {
        const file = path.resolve(
          `packages/${packageName}/__tests__/assets/does_not_exist.config.yaml`,
        );

        expect(() => load(file)).toThrow(/Config file does not exist/);
      });
    });
  });

  describe('copy', () => {
    const pattern = { from: '/path/to/file.json', to: '/new/path/to/file.json' };

    beforeAll(() => {
      jest.mock('fs');
    });

    afterAll(() => {
      jest.unmock('fs');
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    test('should not copy if source file does not exist', () => {
      const existsSyncSpy = jest.spyOn(fs, 'existsSync').mockReturnValueOnce(false);
      const mkdirSyncSpy = jest.spyOn(fs, 'mkdirSync');
      const copyFileSyncSpy = jest.spyOn(fs, 'copyFileSync');

      copy(pattern);

      expect(existsSyncSpy).toHaveBeenCalled();
      expect(mkdirSyncSpy).not.toHaveBeenCalled();
      expect(copyFileSyncSpy).not.toHaveBeenCalled();
    });

    test('should create the destination directory if it does not exist', () => {
      const toDir = path.dirname(pattern.to);
      const existsSyncSpy = jest
        .spyOn(fs, 'existsSync')
        .mockImplementation((file) => file === pattern.from);
      const mkdirSyncSpy = jest.spyOn(fs, 'mkdirSync').mockImplementationOnce(jest.fn());
      const copyFileSyncSpy = jest.spyOn(fs, 'copyFileSync').mockImplementation(jest.fn());

      copy(pattern);

      expect(existsSyncSpy).toHaveBeenCalledWith(pattern.from);
      expect(existsSyncSpy).toHaveBeenCalledWith(toDir);
      expect(mkdirSyncSpy).toHaveBeenCalledWith(toDir);
      expect(copyFileSyncSpy).toHaveBeenCalledWith(pattern.from, pattern.to);
    });

    test('should copy if source file exists', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      const copyFileSyncSpy = jest.spyOn(fs, 'copyFileSync').mockImplementation(jest.fn());

      copy(pattern);

      expect(copyFileSyncSpy).toHaveBeenCalledWith(pattern.from, pattern.to);
    });
  });
});
