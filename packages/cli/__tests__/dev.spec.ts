import { hintedOrigin } from '../src/handlers/dev';
import { DevHint } from '../src/util/devHint';

const HINT: DevHint = {
  version: 1,
  origin: 'http://localhost:3002',
  remoteEntryPath: 'remoteEntry.js',
  writtenAt: new Date(0).toISOString(),
};

/*
 * The decision this file exists for: an unconfirmed hint is still used. `dev start` used
 * to answer a failed probe by opening an overlay that redirected nothing, and then hand
 * over a confirmation page for it — a no-op wearing a confirmation dialog, with the reason
 * visible only in terminal output nobody was looking at any more.
 */
describe('hintedOrigin', () => {
  const respond = (body: unknown, ok = true, status = 200) =>
    jest.fn().mockResolvedValue({ ok, status, json: async () => body });

  const withFetch = (impl: jest.Mock) => {
    globalThis.fetch = impl as unknown as typeof fetch;
  };

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // eslint-disable-next-line no-console
  const messages = () => (console.log as jest.Mock).mock.calls.flat().join('\n');

  it('should use a confirmed origin', async () => {
    withFetch(respond({ remotes: { 'PongModule/Pong': {} } }));

    await expect(hintedOrigin(HINT, ['PongModule/Pong'], 'default/pong')).resolves.toBe(
      HINT.origin,
    );
  });

  // Not started yet is indistinguishable from stale, and it is far the more common of
  // the two. Redirecting is wrong at worst, visible, and undone by `appshell dev stop`.
  it('should redirect anyway when the dev server is not up yet', async () => {
    withFetch(jest.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    await expect(hintedOrigin(HINT, ['PongModule/Pong'], 'default/pong')).resolves.toBe(
      HINT.origin,
    );
  });

  it('should say why it could not confirm, and how to override it', async () => {
    withFetch(jest.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    await hintedOrigin(HINT, ['PongModule/Pong'], 'default/pong');

    expect(messages()).toContain('nothing answered at http://localhost:3002');
    expect(messages()).toContain('--port');
  });

  // The one outcome that is disproved rather than unconfirmed, so the one worth refusing
  // over: redirecting at another package's bundle is a wrong answer, not a missing one.
  it('should refuse a port that now belongs to another package', async () => {
    withFetch(respond({ remotes: { 'PingModule/Ping': {} } }));

    await expect(hintedOrigin(HINT, ['PongModule/Pong'], 'default/pong')).rejects.toThrow(
      /is serving PingModule\/Ping, not default\/pong/,
    );
  });

  it('should name --port when it refuses, since that is the way past it', async () => {
    withFetch(respond({ remotes: { 'PingModule/Ping': {} } }));

    await expect(hintedOrigin(HINT, ['PongModule/Pong'], 'default/pong')).rejects.toThrow(/--port/);
  });
});
