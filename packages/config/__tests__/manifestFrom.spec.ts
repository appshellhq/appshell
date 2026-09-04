/* eslint-disable no-template-curly-in-string -- ${VAR} is the syntax under test */
import { createHash } from 'crypto';
import { manifestFrom } from '../src/generate.manifest';
import { publish } from '../src/publish';
import { AppshellTemplate } from '../src/types';

/*
 * Publish resolves deployment coordinates and leaves configuration alone, because they are
 * unlike things sharing one syntax.
 *
 * `remotes.*.url` is a property of the artifact: only whoever built it knows where it is
 * served, and freezing that into an immutable version is what the version is for. A var is
 * configuration the running package reads, and resolving it here baked the build
 * environment into that same immutable version — right in exactly one environment, wrong
 * everywhere else, and unfixable afterwards.
 */
const templateOf = (): AppshellTemplate =>
  ({
    name: 'App',
    module: { name: 'App' },
    remotes: {
      'App/Thing': { url: '${APP_URL}', filename: 'remoteEntry.js', id: 'x' },
    },
    vars: { App: { SUPPORT_URL: '${SUPPORT_URL}', TIMEOUT_MS: 5000 } },
  } as unknown as AppshellTemplate);

const buildIn = (env: Record<string, string>) => {
  Object.assign(process.env, env);

  return manifestFrom(templateOf());
};

const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

describe('manifestFrom', () => {
  it('should resolve a remote url, which only the build knows', () => {
    const manifest = buildIn({ APP_URL: 'https://cdn.example.com' });

    expect(manifest.remotes['App/Thing'].remoteEntryUrl).toBe(
      'https://cdn.example.com/remoteEntry.js',
    );
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
    const ci = buildIn({ APP_URL: 'https://cdn.example.com', SUPPORT_URL: 'https://support.ci' });
    const prod = buildIn({
      APP_URL: 'https://cdn.example.com',
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
    await expect(
      publishing({ 'App/Thing': { remoteEntryUrl: '${APP_URL}/remoteEntry.js' } }),
    ).rejects.toThrow(/never resolved.*App\/Thing\.remoteEntryUrl/s);
  });

  // Because the alternative is an immutable manifest nothing can load, discovered later as
  // a browser fetching a URL with a variable name in the path.
  it('should name the variable rather than leave it to be found at runtime', async () => {
    await expect(
      publishing({ 'App/Thing': { remoteEntryUrl: '${APP_URL}/remoteEntry.js' } }),
    ).rejects.toThrow(/\$\{APP_URL}/);
  });

  it('should not refuse a resolved one', async () => {
    // Reaches the network and fails there, which is past the guard — the point of the case.
    await expect(
      publishing({ 'App/Thing': { remoteEntryUrl: 'https://cdn.example.com/remoteEntry.js' } }),
    ).rejects.toThrow(/Failed to publish/);
  });
});
