/** @jest-environment jsdom */
import type { AppshellComposition } from '@appshell/config';
import mountOverlayBadge, {
  OVERLAY_EFFECTS,
  overlayBadgeMarkup,
  type OverlayEffect,
} from '../src/overlayBadge';

const compositionWith = (overlay?: AppshellComposition['overlay']): AppshellComposition =>
  ({
    applicationId: 'default/dev',
    revision: 1,
    root: 'ContainerModule/Container',
    rootProps: {},
    index: {},
    remotes: {},
    vars: {},
    overlay,
  } as AppshellComposition);

const badge = () => document.getElementById('appshell-overlay-badge');

describe('overlayBadgeMarkup', () => {
  it('should pluralise the count', () => {
    expect(overlayBadgeMarkup({ id: 'o1', remotes: ['A/One'] })).toContain('1 remote redirected');
    expect(overlayBadgeMarkup({ id: 'o1', remotes: ['A/One', 'B/Two'] })).toContain(
      '2 remotes redirected',
    );
  });

  it('should name the development shell, which is a change the page cannot otherwise show', () => {
    expect(overlayBadgeMarkup({ id: 'o1', remotes: [], shellFlavor: 'dev' })).toContain(
      'development shell',
    );
    expect(overlayBadgeMarkup({ id: 'o1', remotes: ['A/One'], shellFlavor: 'prod' })).not.toContain(
      'development shell',
    );
  });

  it('should list both changes when an overlay made both', () => {
    expect(overlayBadgeMarkup({ id: 'o1', remotes: ['A/One'], shellFlavor: 'dev' })).toContain(
      'development shell, 1 remote redirected',
    );
  });

  /*
   * Named rather than counted. A theme changes what the whole page looks like, so the
   * useful question is which one — a badge saying "something is different" while the
   * difference is the thing you are staring at helps nobody.
   */
  it('should name the theme an overlay substituted', () => {
    expect(
      overlayBadgeMarkup({ id: 'o1', remotes: [], shellFlavor: 'prod', theme: 'acme/brand@1.0.0' }),
    ).toContain('theme acme/brand@1.0.0');
  });

  it('should say nothing about a theme when the overlay did not change one', () => {
    expect(overlayBadgeMarkup({ id: 'o1', remotes: ['A/One'], shellFlavor: 'prod' })).not.toContain(
      'theme',
    );
  });

  it('should list a theme alongside the other changes', () => {
    expect(
      overlayBadgeMarkup({
        id: 'o1',
        remotes: ['A/One'],
        shellFlavor: 'dev',
        theme: 'acme/brand@1.0.0',
      }),
    ).toContain('development shell, 1 remote redirected, theme acme/brand@1.0.0');
  });

  it('should escape a theme ref for the same reason it escapes a remote key', () => {
    const markup = overlayBadgeMarkup({
      id: 'o1',
      remotes: [],
      shellFlavor: 'prod',
      theme: '<img src=x onerror=alert(1)>',
    });

    expect(markup).not.toContain('<img');
    expect(markup).toContain('&lt;img');
  });

  it('should escape a remote key rather than trusting where it came from', () => {
    const markup = overlayBadgeMarkup({ id: 'o1', remotes: ['<img src=x onerror=alert(1)>'] });

    expect(markup).not.toContain('<img');
    expect(markup).toContain('&lt;img');
  });
});

describe('mountOverlayBadge', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should render nothing when no overlay is active', () => {
    mountOverlayBadge(compositionWith());

    expect(badge()).toBeNull();
  });

  it('should still render for an overlay that only swapped the shell bundle', () => {
    mountOverlayBadge(compositionWith({ id: 'o1', remotes: [], shellFlavor: 'dev' }));

    expect(badge()?.textContent).toContain('development shell');
    expect(badge()?.querySelector('ul')).toBeNull();
  });

  it('should render nothing when there is no composition at all', () => {
    mountOverlayBadge(undefined);

    expect(badge()).toBeNull();
  });

  it('should name every redirected remote so the page cannot lie by omission', () => {
    mountOverlayBadge(
      compositionWith({
        id: 'o1',
        remotes: ['PingModule/Ping', 'PongModule/Pong'],
        shellFlavor: 'dev',
      }),
    );

    const items = [...(badge()?.querySelectorAll('li') ?? [])].map((li) => li.textContent);

    expect(items).toEqual(['PingModule/Ping', 'PongModule/Pong']);
  });

  it('should mount outside the react root so a crash in the package cannot take it down', () => {
    document.body.innerHTML = '<div id="root"></div>';
    mountOverlayBadge(
      compositionWith({ id: 'o1', remotes: ['PongModule/Pong'], shellFlavor: 'dev' }),
    );

    expect(document.getElementById('root')?.contains(badge())).toBe(false);
    expect(badge()?.parentElement).toBe(document.body);
  });

  it('should stay open by default rather than hiding behind a click', () => {
    mountOverlayBadge(
      compositionWith({ id: 'o1', remotes: ['PongModule/Pong'], shellFlavor: 'dev' }),
    );

    expect(badge()?.querySelector('details')?.hasAttribute('open')).toBe(true);
  });

  it('should not stack a second badge if called twice', () => {
    const composition = compositionWith({
      id: 'o1',
      remotes: ['PongModule/Pong'],
      shellFlavor: 'dev',
    });

    mountOverlayBadge(composition);
    mountOverlayBadge(composition);

    expect(document.querySelectorAll('#appshell-overlay-badge')).toHaveLength(1);
  });
});

/*
 * Generated from OVERLAY_EFFECTS rather than written out, so the badge cannot fall behind
 * the overlay. This is the surface where the omission was first found: it listed remotes
 * and shell flavour, and a theme-only overlay produced a badge naming nothing that had
 * changed.
 *
 * Two stages, and only the first is a compile error. Adding a field to the composition's
 * overlay fails to compile until it is classified as an effect or as identity, because
 * that check lives in src, which is typechecked. Classifying it as an effect then makes
 * `it.each` iterate a key this Record has no entry for, and the case fails — at test time,
 * since spec files are not in the typecheck include.
 */
describe('every effect an overlay carries', () => {
  const carrying: Record<
    OverlayEffect,
    { only: NonNullable<AppshellComposition['overlay']>; mentions: RegExp }
  > = {
    remotes: {
      only: { id: 'o1', remotes: ['PongModule/Pong'], shellFlavor: 'prod' },
      mentions: /1 remote redirected/,
    },
    shellFlavor: {
      only: { id: 'o1', remotes: [], shellFlavor: 'dev' },
      mentions: /development shell/,
    },
    theme: {
      only: { id: 'o1', remotes: [], shellFlavor: 'prod', theme: 'acme/brand@2.0.0' },
      mentions: /theme acme\/brand@2\.0\.0/,
    },
  };

  it.each(OVERLAY_EFFECTS)('should be named on the badge when only %s is set', (effect) => {
    const { only, mentions } = carrying[effect];

    expect(overlayBadgeMarkup(only)).toMatch(mentions);
  });
});
