import fs from 'fs';
import os from 'os';
import path from 'path';
import yaml from 'yaml';
import { buildCli } from '../../../cli';

/*
 * Driven through the real parser rather than by calling the handler, because the handler
 * takes an args object and so cannot say anything about what the CLI puts in one.
 *
 * These flags already worked before they were declared: the CLI uses strictCommands()
 * rather than strict(), so yargs passes an undeclared option straight through to argv.
 * What they were not was discoverable — `config init --help` did not mention them. The
 * declarations fix the help; these tests pin the behaviour so it stays true.
 */
describe('config init', () => {
  let dir: string;
  let configPath: string;
  let logged: string[] = [];
  const original = process.env.APPSHELL_CONFIG;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'appshell-init-'));
    configPath = path.join(dir, 'config');
    process.env.APPSHELL_CONFIG = configPath;
    logged = [];
    jest.spyOn(console, 'log').mockImplementation((...a: unknown[]) => {
      logged.push(a.join(' '));
    });
  });

  afterEach(() => {
    process.env.APPSHELL_CONFIG = original;
    fs.rmSync(dir, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  const written = () => yaml.parse(fs.readFileSync(configPath, 'utf-8'));

  it('writes the issuer and client passed on the command line', async () => {
    await buildCli([
      'config',
      'init',
      '--auth-issuer',
      'https://auth.example.com/realms/navaris',
      '--client-id',
      'custom-cli',
    ]).parseAsync();

    // Stored kebab-case, which is the shape `appshell config list` prints.
    expect(written()).toMatchObject({
      'auth-issuer': 'https://auth.example.com/realms/navaris',
      'client-id': 'custom-cli',
    });
  });

  it('keeps a configured issuer when init is re-run without one', async () => {
    fs.writeFileSync(configPath, yaml.stringify({ 'auth-issuer': 'https://kept.example.com' }));

    await buildCli(['config', 'init']).parseAsync();

    // This is the one that guards the change itself. Declaring the options was safe only
    // because they carry no default: with one, yargs would always supply a value, the
    // handler's `?? existing` would never fire, and re-running init would silently wipe a
    // configured issuer.
    expect(written()['auth-issuer']).toBe('https://kept.example.com');
  });

  it('says so when it finishes with no issuer', async () => {
    await buildCli(['config', 'init']).parseAsync();

    expect(logged.join('\n')).toContain('auth-issuer is unset');
  });

  it('stays quiet when the issuer is already configured', async () => {
    fs.writeFileSync(configPath, yaml.stringify({ 'auth-issuer': 'https://kept.example.com' }));

    await buildCli(['config', 'init']).parseAsync();

    expect(logged.join('\n')).not.toContain('auth-issuer is unset');
  });
});
