/**
 * React only wires up Fast Refresh when `__REACT_DEVTOOLS_GLOBAL_HOOK__` already
 * exists at the moment `react-dom` evaluates: it reads the hook at module scope and
 * skips injection entirely when there is none, leaving nothing for a refresh runtime
 * to attach to later.
 *
 * The shell owns React for the whole composed page, so the hook has to be installed
 * here — before `bootstrap` pulls `react-dom` in — or no remote's refresh runtime can
 * ever reach the tree, and every hot update in every remote silently does nothing.
 *
 * Requiring lazily keeps `react-refresh` out of the production bundle entirely: the
 * check folds to `false` at build time and the branch is eliminated.
 */
export default (): void => {
  if (process.env.NODE_ENV === 'production') return;

  // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
  const { injectIntoGlobalHook } = require('react-refresh/runtime');

  injectIntoGlobalHook(window);
};
