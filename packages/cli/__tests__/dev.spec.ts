import { describeOverlay, effectLines, hintedOrigin, OverlayEffects } from '../src/handlers/dev';
import { DevHint } from '../src/util/devHint';
import { OVERLAY_EFFECTS, OverlayEffect } from '../src/util/registry';

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

/*
 * Generated from OVERLAY_EFFECTS rather than written out, so neither describer can fall
 * behind the overlay shape. Both omitted the theme when it was added; `dev start`'s output
 * was the last to be fixed, because inline console.log calls left nothing to assert on.
 *
 * Two stages, and only the first is a compile error. Adding a field to OpenOverlay fails
 * to compile until it is classified as an effect or as identity, because that check lives
 * in src, which is typechecked. Classifying it as an effect then makes `it.each` iterate a
 * key these Records have no entry for, and both cases fail — at test time, since spec files
 * are not in the typecheck include. Enough to stop a surface drifting, and worth stating
 * accurately rather than claiming the types catch more than they do.
 *
 * The expectations are per surface on purpose. `status` prints a one-line summary and
 * counts redirected remotes; `start` lists them by name with their targets. Both report
 * the effect; neither is wrong; a single shared assertion would have to pick one idiom and
 * call the other a failure.
 */
describe('every effect an overlay carries', () => {
  const only: Record<OverlayEffect, OverlayEffects> = {
    remotes: { remotes: ['PongModule/Pong'], shellFlavor: 'prod' },
    shellFlavor: { remotes: [], shellFlavor: 'dev' },
    theme: { remotes: [], shellFlavor: 'prod', theme: 'acme/brand@2.0.0' },
  };

  const inStatus: Record<OverlayEffect, RegExp> = {
    remotes: /1 redirected/,
    shellFlavor: /development shell/,
    theme: /acme\/brand@2\.0\.0/,
  };

  const inStart: Record<OverlayEffect, RegExp> = {
    remotes: /PongModule\/Pong/,
    shellFlavor: /development bundle/,
    theme: /acme\/brand@2\.0\.0/,
  };

  it.each(OVERLAY_EFFECTS)('should be described by dev status when only %s is set', (effect) => {
    expect(describeOverlay(only[effect])).toMatch(inStatus[effect]);
  });

  it.each(OVERLAY_EFFECTS)('should be reported by dev start when only %s is set', (effect) => {
    const redirected = Object.fromEntries(
      only[effect].remotes.map((key) => [
        key,
        { remoteEntryUrl: `http://localhost:3002/${key}.js` },
      ]),
    );

    expect(effectLines(only[effect], redirected).join('\n')).toMatch(inStart[effect]);
  });

  // Not "no changes": that is what a theme-only overlay used to report while having
  // changed what the entire page looks like.
  it('should say so only when there is genuinely nothing', () => {
    expect(describeOverlay({ remotes: [], shellFlavor: 'prod' })).toBe('no changes');
  });
});
