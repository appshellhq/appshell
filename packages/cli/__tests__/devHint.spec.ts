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

  it('should return nothing when the app was never served', () => {
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

describe('verifyDevHint', () => {
  const respond = (body: unknown, ok = true) =>
    jest.fn().mockResolvedValue({ ok, json: async () => body });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const withFetch = (impl: jest.Mock) => {
    globalThis.fetch = impl as unknown as typeof fetch;
  };

  it('should accept an origin serving the remotes about to be redirected', async () => {
    withFetch(respond({ remotes: { 'PongModule/Pong': {}, 'PongModule/CoolComponent': {} } }));

    await expect(verifyDevHint(HINT, ['PongModule/Pong'])).resolves.toBe(true);
  });

  it('should refuse an origin now serving a different app', async () => {
    // The port was reused. A probe that only asked "did anything answer" would pass
    // here and redirect this app at somebody else's bundle.
    withFetch(respond({ remotes: { 'PingModule/Ping': {} } }));

    await expect(verifyDevHint(HINT, ['PongModule/Pong'])).resolves.toBe(false);
  });

  it('should refuse when only some of the remotes are served', async () => {
    withFetch(respond({ remotes: { 'PongModule/Pong': {} } }));

    await expect(
      verifyDevHint(HINT, ['PongModule/Pong', 'PongModule/CoolComponent']),
    ).resolves.toBe(false);
  });

  it('should refuse when nothing is listening', async () => {
    withFetch(jest.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    await expect(verifyDevHint(HINT, ['PongModule/Pong'])).resolves.toBe(false);
  });

  it('should refuse a non-ok response', async () => {
    withFetch(respond({}, false));

    await expect(verifyDevHint(HINT, ['PongModule/Pong'])).resolves.toBe(false);
  });

  it('should refuse rather than vacuously pass when there is nothing to check', async () => {
    const fetchMock = respond({ remotes: {} });
    withFetch(fetchMock);

    await expect(verifyDevHint(HINT, [])).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
