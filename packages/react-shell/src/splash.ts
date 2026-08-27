/**
 * Removes the placeholder the registry rendered, once the root package has put something
 * on the page.
 *
 * Plain DOM outside the React tree, for the same reason as the overlay badge: the element
 * was never React's to begin with — it is in the document before this bundle is fetched —
 * and nothing about dismissing it is React-specific.
 *
 * It watches for content rather than taking a callback from `RemoteSlot`. A callback would
 * put a prop on the public component that exists only to serve the shell, and would still
 * fire before the browser had painted anything. First rendered child is the honest signal:
 * it is the moment there is something to look at.
 */
const SPLASH_ID = 'appshell-splash';

/** Long enough to be a stuck load rather than a slow one. */
const GIVE_UP_AFTER_MS = 30_000;

const remove = (splash: Element) => splash.parentNode?.removeChild(splash);

export default (root: HTMLElement): (() => void) => {
  const splash = document.getElementById(SPLASH_ID);

  // Absent when a host renders its own document rather than letting the registry serve one.
  if (!splash) return () => {};

  if (root.firstElementChild) {
    remove(splash);

    return () => {};
  }

  const observer = new MutationObserver(() => {
    if (!root.firstElementChild) return;

    observer.disconnect();
    remove(splash);
  });

  observer.observe(root, { childList: true });

  // A root package that never loads would otherwise leave the placeholder covering the
  // error the shell rendered underneath it.
  const timeout = setTimeout(() => {
    observer.disconnect();
    remove(splash);
  }, GIVE_UP_AFTER_MS);

  return () => {
    observer.disconnect();
    clearTimeout(timeout);
  };
};
