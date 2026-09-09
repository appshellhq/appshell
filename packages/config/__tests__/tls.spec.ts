import fs from 'fs';
import os from 'os';
import path from 'path';
import yaml from 'yaml';
import { caFile, httpsAgent } from '../src/tls';

/*
 * Trust is configuration of the registry you talk to, not of the shell you are in. npm
 * reaches the same place with `cafile` in .npmrc.
 */
describe('ca-file', () => {
  let dir: string;
  const originalConfig = process.env.APPSHELL_CONFIG;
  const originalEnv = process.env.APPSHELL_CA_FILE;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'appshell-tls-'));
    process.env.APPSHELL_CONFIG = path.join(dir, 'config');
    delete process.env.APPSHELL_CA_FILE;
    jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.APPSHELL_CONFIG = originalConfig;
    if (originalEnv === undefined) delete process.env.APPSHELL_CA_FILE;
    else process.env.APPSHELL_CA_FILE = originalEnv;
    fs.rmSync(dir, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  const configured = (value?: string) =>
    fs.writeFileSync(
      path.join(dir, 'config'),
      yaml.stringify(value ? { 'ca-file': value } : { registry: 'http://localhost:7150' }),
    );

  const pem = () => {
    const file = path.join(dir, 'root.pem');
    fs.writeFileSync(
      file,
      '-----BEGIN CERTIFICATE-----\nnot a real one\n-----END CERTIFICATE-----',
    );
    return file;
  };

  it('reads ca-file from the cli config', () => {
    const file = pem();
    configured(file);

    expect(caFile()).toBe(file);
  });

  it('lets the environment override the config', () => {
    configured(pem());
    process.env.APPSHELL_CA_FILE = '/from/env.pem';

    expect(caFile()).toBe('/from/env.pem');
  });

  it('uses node defaults when nothing is configured', () => {
    configured();

    expect(caFile()).toBeUndefined();
    expect(httpsAgent()).toBeUndefined();
  });

  it('builds an agent carrying the configured bundle', () => {
    configured(pem());

    expect(httpsAgent()?.options.ca).toEqual(fs.readFileSync(path.join(dir, 'root.pem')));
  });

  /*
   * Skipping a missing file would reproduce the certificate error it was set to avoid,
   * which is the one failure the user has already tried to fix.
   */
  it('refuses a ca-file that does not exist', () => {
    configured('/nope/missing.pem');

    expect(() => httpsAgent()).toThrow(/ca-file does not exist.*missing\.pem/);
  });
});
