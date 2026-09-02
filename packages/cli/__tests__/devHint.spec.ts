import fs from 'fs';
import os from 'os';
import path from 'path';
import { readDevHint, verifyDevHint } from '../src/util/devHint';

const HINT = {
  version: 1,
  origin: 'http://localhost:3002',
  remoteEntryPath: 'remoteEntry.js',
  writtenAt: new Date(0).toISOString(),
};

describe('readDevHint', () => {
  let cwd: string;

  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'appshell-read-'));
    fs.mkdirSync(path.join(cwd, 'dist'));
  });

  afterEach(() => fs.rmSync(cwd, { recursive: true, force: true }));

  const put = (contents: unknown) =>
    fs.writeFileSync(
      path.join(cwd, 'dist', '.appshell-dev.json'),
      typeof contents === 'string' ? contents : JSON.stringify(contents),
    );

  it('should read a hint the plugin wrote', () => {
    put(HINT);

    expect(readDevHint(cwd)).toEqual(HINT);
  });

  it('should return nothing when the package was never served', () => {
    expect(readDevHint(cwd)).toBeUndefined();
  });

  it('should ignore a hint written by a future plugin', () => {
    put({ ...HINT, version: 99 });

    expect(readDevHint(cwd)).toBeUndefined();
  });

  it('should ignore an unreadable hint rather than fail the command', () => {
    put('{ not json');

    expect(readDevHint(cwd)).toBeUndefined();
  });
});

/*
 * The three verdicts are the point: the middle one keeps `dev start` working when the dev
 * server simply has not been started yet, which is the case that used to produce an
 * overlay redirecting nothing at all.
 */
describe('verifyDevHint', () => {
  const respond = (body: unknown, ok = true, status = 200) =>
    jest.fn().mockResolvedValue({ ok, status, json: async () => body });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const withFetch = (impl: jest.Mock) => {
    globalThis.fetch = impl as unknown as typeof fetch;
  };

  it('should confirm an origin serving every remote about to be redirected', async () => {
    withFetch(respond({ remotes: { 'PongModule/Pong': {}, 'PongModule/CoolComponent': {} } }));

    await expect(verifyDevHint(HINT, ['PongModule/Pong'])).resolves.toEqual({
      verdict: 'serving',
    });
  });

  // The port was reused. A probe that only asked "did anything answer" would pass here
  // and redirect this package at somebody else's bundle.
  it('should call an origin serving only another package displaced', async () => {
    withFetch(respond({ remotes: { 'PingModule/Ping': {} } }));

    await expect(verifyDevHint(HINT, ['PongModule/Pong'])).resolves.toEqual({
      verdict: 'displaced',
      serving: ['PingModule/Ping'],
    });
  });

  // The origin is right and the build is behind, which is worth saying and not worth
  // refusing over — so this must not be reported as somebody else's port.
  it('should not call a stale build of the same package displaced', async () => {
    withFetch(respond({ remotes: { 'PongModule/Pong': {} } }));

    await expect(
      verifyDevHint(HINT, ['PongModule/Pong', 'PongModule/CoolComponent']),
    ).resolves.toEqual({
      verdict: 'unconfirmed',
      reason: expect.stringContaining('PongModule/CoolComponent'),
    });
  });

  it('should leave a port nothing answers on unconfirmed rather than disproved', async () => {
    withFetch(jest.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    await expect(verifyDevHint(HINT, ['PongModule/Pong'])).resolves.toEqual({
      verdict: 'unconfirmed',
      reason: expect.stringContaining('nothing answered'),
    });
  });

  // Asking the wrong question is not evidence about the answer. This is also what the
  // current probe path returns, so it must not be the verdict that refuses.
  it('should leave a non-ok response unconfirmed', async () => {
    withFetch(respond({}, false, 404));

    await expect(verifyDevHint(HINT, ['PongModule/Pong'])).resolves.toEqual({
      verdict: 'unconfirmed',
      reason: expect.stringContaining('404'),
    });
  });

  it('should leave a response that is not a manifest unconfirmed', async () => {
    withFetch(
      jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Unexpected token <');
        },
      }),
    );

    await expect(verifyDevHint(HINT, ['PongModule/Pong'])).resolves.toEqual({
      verdict: 'unconfirmed',
      reason: expect.stringContaining('did not answer with a manifest'),
    });
  });

  // A half-started dev server looks like this, so it is not somebody else's port.
  it('should leave an origin serving no remotes at all unconfirmed', async () => {
    withFetch(respond({ remotes: {} }));

    await expect(verifyDevHint(HINT, ['PongModule/Pong'])).resolves.toEqual({
      verdict: 'unconfirmed',
      reason: expect.stringContaining('serving no remotes'),
    });
  });

  it('should not probe when there is nothing to check for', async () => {
    const fetchMock = respond({ remotes: {} });
    withFetch(fetchMock);

    await expect(verifyDevHint(HINT, [])).resolves.toEqual({
      verdict: 'unconfirmed',
      reason: expect.any(String),
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
