import fs from 'fs';
import os from 'os';
import path from 'path';
import tls from 'tls';
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

  /*
   * In addition to Node's roots, not instead of them. This used to assert that `ca` was the
   * bundle alone, which is the bug it now guards against: `ca` replaces the trust store, so a
   * config trusting a local mkcert root could no longer reach a registry with a public
   * certificate ("unable to get local issuer certificate").
   */
  it("builds an agent trusting the configured bundle and Node's own roots", () => {
    configured(pem());

    const ca = httpsAgent()?.options.ca as string[];

    expect(ca).toContain(fs.readFileSync(path.join(dir, 'root.pem'), 'utf-8'));
    expect(ca).toEqual(expect.arrayContaining([...tls.rootCertificates]));
  });

  /*
   * Node's *effective* defaults, so a root a user added through NODE_EXTRA_CA_CERTS or
   * --use-system-ca survives a ca-file too. tls.rootCertificates is the bundled roots alone.
   */
  it('keeps the roots Node was given at runtime, not only its bundled ones', () => {
    const runtime = '-----BEGIN CERTIFICATE-----\nfrom NODE_EXTRA_CA_CERTS\n-----END CERTIFICATE-----';
    const effective = jest
      .spyOn(tls as unknown as { getCACertificates: (t: string) => string[] }, 'getCACertificates')
      .mockReturnValue([...tls.rootCertificates, runtime]);
    configured(pem());

    const ca = httpsAgent()?.options.ca as string[];

    expect(effective).toHaveBeenCalledWith('default');
    expect(ca).toContain(runtime);
  });

  /*
   * Skipping a missing file would reproduce the certificate error it was set to avoid,
   * which is the one failure the user has already tried to fix.
   */
  it('refuses a ca-file that does not exist', () => {
    configured('/nope/missing.pem');

    expect(() => httpsAgent()).toThrow(/ca-file does not exist.*missing\.pem/);
  });

  /*
   * readConfig is called while building the https agent, which happens when the axios
   * module is imported — before any command runs and before yargs can silence anything.
   *
   * It used to debug-log the path and then the config twice, and every caller suppressed
   * that by replacing console.debug around the call. The first call site that did not
   * printed the whole config, `apiKey` included, ahead of every command's real output.
   */
  it('reads the config without logging it', () => {
    const debug = jest.spyOn(console, 'debug').mockImplementation(() => {});
    configured(pem());

    caFile();

    expect(debug).not.toHaveBeenCalled();
  });
});
