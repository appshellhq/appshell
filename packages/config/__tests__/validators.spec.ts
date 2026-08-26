import chalk from 'chalk';
import { AppshellTemplateValidator } from '../src/validators';
import appshellConfigRemoteCollisions from './assets/appshell.config-remote-collision.json';
import validAppshellConfig from './assets/appshell_configs/BarModule-Bar.json';
import bizAppshellConfig from './assets/appshell_configs/BizModule-Biz.json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyConfig = any;

describe('validators', () => {
  let consoleSpy: jest.SpyInstance;
  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log');
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('AppshellTemplateValidator', () => {
    it('should pass a valid appshell config template', () => {
      AppshellTemplateValidator.validate(validAppshellConfig);

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should throw if multiple remotes with the same ID', () => {
      AppshellTemplateValidator.validate<AnyConfig>(bizAppshellConfig, bizAppshellConfig);

      expect(consoleSpy).toHaveBeenCalledWith(chalk.yellow('Multiple remotes with the same ID'));
    });

    it('should throw if multiple remotes with the same key', () => {
      AppshellTemplateValidator.validate<AnyConfig>(
        bizAppshellConfig,
        appshellConfigRemoteCollisions,
      );

      expect(consoleSpy).toHaveBeenCalledWith(chalk.yellow('Multiple remotes with the same key'));
    });
  });
});
