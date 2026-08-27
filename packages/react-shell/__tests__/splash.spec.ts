/** @jest-environment jsdom */
import dismissSplashWhenMounted from '../src/splash';

const SPLASH = 'appshell-splash';

describe('splash', () => {
  let root: HTMLElement;

  const build = ({ withSplash = true } = {}) => {
    document.body.innerHTML = withSplash ? `<div id="${SPLASH}"></div><div id="root"></div>` : '<div id="root"></div>';
    root = document.getElementById('root') as HTMLElement;
  };

  const splash = () => document.getElementById(SPLASH);
  const settle = () =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });

  beforeEach(() => build());

  it('should leave the placeholder up while the root is empty', async () => {
    dismissSplashWhenMounted(root);
    await settle();

    expect(splash()).not.toBeNull();
  });

  it('should remove it once the root package renders something', async () => {
    dismissSplashWhenMounted(root);
    root.appendChild(document.createElement('main'));
    await settle();

    expect(splash()).toBeNull();
  });

  // React can commit before this runs, and a placeholder left over a rendered page is
  // worse than never showing one.
  it('should remove it immediately when the root already has content', () => {
    root.appendChild(document.createElement('main'));

    dismissSplashWhenMounted(root);

    expect(splash()).toBeNull();
  });

  it('should ignore text and comment nodes, which are not something to look at', async () => {
    dismissSplashWhenMounted(root);
    root.appendChild(document.createTextNode(' '));
    root.appendChild(document.createComment('placeholder'));
    await settle();

    expect(splash()).not.toBeNull();
  });

  // A host that serves its own document has no placeholder to remove.
  it('should do nothing when the document has no placeholder', () => {
    build({ withSplash: false });

    expect(() => dismissSplashWhenMounted(root)).not.toThrow();
  });

  it('should give up rather than cover an error that never resolves', () => {
    jest.useFakeTimers();
    dismissSplashWhenMounted(root);

    jest.advanceTimersByTime(30_000);

    expect(splash()).toBeNull();
    jest.useRealTimers();
  });

  it('should stop watching once disposed', async () => {
    const dispose = dismissSplashWhenMounted(root);

    dispose();
    root.appendChild(document.createElement('main'));
    await settle();

    expect(splash()).not.toBeNull();
  });
});
