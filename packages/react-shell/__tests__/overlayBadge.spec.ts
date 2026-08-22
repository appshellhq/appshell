/** @jest-environment jsdom */
import type { AppshellComposition } from '@appshell/config';
import mountOverlayBadge, { overlayBadgeMarkup } from '../src/overlayBadge';

const compositionWith = (overlay?: AppshellComposition['overlay']): AppshellComposition =>
  ({
    environmentId: 'default/dev',
    revision: 1,
    root: 'ContainerModule/Container',
    rootProps: {},
    index: {},
    remotes: {},
    environment: {},
    overlay,
  }) as AppshellComposition;

const badge = () => document.getElementById('appshell-overlay-badge');

describe('overlayBadgeMarkup', () => {
  it('should pluralise the count', () => {
    expect(overlayBadgeMarkup(['A/One'])).toContain('1 remote redirected');
    expect(overlayBadgeMarkup(['A/One', 'B/Two'])).toContain('2 remotes redirected');
  });

  it('should escape a remote key rather than trusting where it came from', () => {
    const markup = overlayBadgeMarkup(['<img src=x onerror=alert(1)>']);

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

  it('should render nothing when an overlay redirected no remotes', () => {
    mountOverlayBadge(compositionWith({ id: 'o1', remotes: [] }));

    expect(badge()).toBeNull();
  });

  it('should render nothing when there is no composition at all', () => {
    mountOverlayBadge(undefined);

    expect(badge()).toBeNull();
  });

  it('should name every redirected remote so the page cannot lie by omission', () => {
    mountOverlayBadge(compositionWith({ id: 'o1', remotes: ['PingModule/Ping', 'PongModule/Pong'] }));

    const items = [...(badge()?.querySelectorAll('li') ?? [])].map((li) => li.textContent);

    expect(items).toEqual(['PingModule/Ping', 'PongModule/Pong']);
  });

  it('should mount outside the react root so a crash in the app cannot take it down', () => {
    document.body.innerHTML = '<div id="root"></div>';
    mountOverlayBadge(compositionWith({ id: 'o1', remotes: ['PongModule/Pong'] }));

    expect(document.getElementById('root')?.contains(badge())).toBe(false);
    expect(badge()?.parentElement).toBe(document.body);
  });

  it('should stay open by default rather than hiding behind a click', () => {
    mountOverlayBadge(compositionWith({ id: 'o1', remotes: ['PongModule/Pong'] }));

    expect(badge()?.querySelector('details')?.hasAttribute('open')).toBe(true);
  });

  it('should not stack a second badge if called twice', () => {
    const composition = compositionWith({ id: 'o1', remotes: ['PongModule/Pong'] });

    mountOverlayBadge(composition);
    mountOverlayBadge(composition);

    expect(document.querySelectorAll('#appshell-overlay-badge')).toHaveLength(1);
  });
});
