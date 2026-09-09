/* eslint-disable no-template-curly-in-string -- ${VAR} is the syntax under test */
import { createHash } from 'crypto';
import { manifestFrom } from '../src/generate.manifest';
import { publish } from '../src/publish';
import { AppshellTemplate } from '../src/types';

/*
 * A manifest describes the artifact, and nothing about the environment that built it.
 *
 * Neither half is resolved here now. A var is configuration the running package reads, and
 * the application supplies it — substituting it at publish baked one environment into an
 * immutable version. An origin turned out to be the same mistake wearing different clothes:
 * a package is published once and deployed many times, so where a bundle is served from
 * belongs to whoever deploys it. The registry composes it from the package's address.
 */
const templateOf = (): AppshellTemplate =>
  ({
    name: 'App',
    module: { name: 'App' },
    remotes: {
      'App/Thing': { id: 'x' },
    },
    vars: { App: { SUPPORT_URL: '${SUPPORT_URL}', TIMEOUT_MS: 5000 } },
  } as unknown as AppshellTemplate);

const buildIn = (env: Record<string, string>) => {
  Object.assign(process.env, env);

  return manifestFrom(templateOf());
};

const remoteOf = (m: ReturnType<typeof manifestFrom>) => m.remotes['App/Thing'];

const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

describe('manifestFrom', () => {
  it('should state no origin', () => {
    const remote = remoteOf(buildIn({ APP_URL: 'https://cdn.example.com' }));

    expect(remote).not.toHaveProperty('remoteEntryUrl');
    expect(remote).not.toHaveProperty('manifestUrl');
  });

  // Defaulted from the Module Federation config, which is what emits the file.
  it('should name the entry file the build emits', () => {
    expect(remoteOf(buildIn({})).filename).toBe('remoteEntry.js');
  });

  // The placeholder is the declaration: this package reads this name and cannot value it.
  it('should leave a var as the declaration it is', () => {
    const manifest = buildIn({ SUPPORT_URL: 'https://support.example.com' });

    expect(manifest.vars.App.SUPPORT_URL).toBe('${SUPPORT_URL}');
  });

  // A literal is an honest static default and survives untouched.
  it('should keep a literal default', () => {
    expect(buildIn({}).vars.App.TIMEOUT_MS).toBe(5000);
  });

  /*
   * The property the whole change exists for. digestOf hashes the manifest, so while vars
   * were substituted the same commit published as different content depending on where it
   * was built — an artifact identity that depended on the build environment.
   */
  it('should publish identical content from different environments', () => {
    // The origins differ too, not just the vars: neither reaches the manifest any more.
    const ci = buildIn({
      APP_URL: 'https://cdn.ci.example.com',
      SUPPORT_URL: 'https://support.ci',
    });
    const prod = buildIn({
      APP_URL: 'https://cdn.prod.example.com',
      SUPPORT_URL: 'https://support.prod',
    });

    expect(digest(ci)).toBe(digest(prod));
  });

  /*
   * What this replaced. An unset var was substituted with the string "undefined" and frozen
   * in: not a value, not absent, and truthy, so nothing downstream could catch it.
   */
  it('should never bake the string undefined into a manifest', () => {
    delete process.env.SUPPORT_URL;

    expect(buildIn({}).vars.App.SUPPORT_URL).not.toBe('undefined');
  });
});

/*
 * The other half of the rule, checked where publishing happens rather than where the
 * manifest is built, so a build without a complete environment still emits its assets.
 */
describe('publish', () => {
  const publishing = (remotes: Record<string, unknown>) =>
    publish({
      registry: 'http://localhost:1',
      name: 'app',
      version: '1.0.0',
      manifest: { remotes } as never,
    });

  it('should refuse a deployment coordinate that never resolved', async () => {
    await expect(publishing({ 'App/Thing': { filename: '${ENTRY_FILE}' } })).rejects.toThrow(
      /never resolved.*App\/Thing\.filename/s,
    );
  });

  // Because the alternative is an immutable manifest nothing can load, discovered later as
  // a browser fetching a URL with a variable name in the path.
  it('should name the variable rather than leave it to be found at runtime', async () => {
    await expect(publishing({ 'App/Thing': { filename: '${ENTRY_FILE}' } })).rejects.toThrow(
      /\$\{ENTRY_FILE}/,
    );
  });

  it('should not refuse a resolved one', async () => {
    // Reaches the network and fails there, which is past the guard — the point of the case.
    await expect(publishing({ 'App/Thing': { filename: 'remoteEntry.js' } })).rejects.toThrow(
      /Failed to publish/,
    );
  });
});
