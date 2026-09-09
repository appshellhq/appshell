import fs from 'fs';
import os from 'os';
import path from 'path';
import yaml from 'yaml';
import { buildCli } from '../../../cli';

/*
 * Driven through the real parser, because the defect was not in the handler's logic: the
 * list of settable keys was hand-maintained beside it, so adding caFile to CliConfig gave
 * the cli a setting it could read and refused to write.
 */
describe('config set', () => {
  let dir: string;
  let configPath: string;
  const original = process.env.APPSHELL_CONFIG;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'appshell-set-'));
    configPath = path.join(dir, 'config');
    process.env.APPSHELL_CONFIG = configPath;
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.APPSHELL_CONFIG = original;
    fs.rmSync(dir, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  const written = () => yaml.parse(fs.readFileSync(configPath, 'utf-8'));

  it('sets ca-file, stored kebab-case as the file spells it', async () => {
    await buildCli(['config', 'set', 'ca-file', '/certs/root.pem']).parseAsync();

    expect(written()['ca-file']).toBe('/certs/root.pem');
  });

  it('accepts the camelCase spelling too', async () => {
    await buildCli(['config', 'set', 'caFile', '/certs/root.pem']).parseAsync();

    expect(written()['ca-file']).toBe('/certs/root.pem');
  });

  // exitProcess(false) because yargs exits the process on a handler error otherwise, and
  // buildCli deliberately installs no fail handler of its own.
  it('still refuses a key that is not a setting', async () => {
    await expect(
      buildCli(['config', 'set', 'nonsense', 'x']).exitProcess(false).parseAsync(),
    ).rejects.toThrow(/Unknown setting 'nonsense'/);
  });
});
