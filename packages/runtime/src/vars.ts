/* eslint-disable no-underscore-dangle, @typescript-eslint/naming-convention */
/**
 * The scope-aware accessor, deliberately kept out of this package's main entry.
 *
 * `@appshell/runtime` is shared as a singleton, so exactly one copy of it exists on the
 * page — whichever package wins the share negotiation. A `__APPSHELL_SCOPE__` compiled
 * into that copy would be one package's scope, and every other package would silently
 * read the wrong vars. So this module ships as the `@appshell/runtime/vars` subpath,
 * which the exact-match share key does not catch: each package bundles its own copy and
 * gets its own scope substituted, while the store they all reach through the bare
 * `@appshell/runtime` import below stays the one shared instance.
 *
 * That bare specifier is load-bearing. A relative import of the store here would bind to
 * a local copy and bypass the singleton entirely.
 */
import { MissingScopeError, readVars, type Vars } from '@appshell/runtime';

/**
 * The module federation container name of the package this module was compiled into.
 *
 * `AppshellPlugin` substitutes it with a `DefinePlugin` constant during the package's
 * own build. It is declared, never defined: nothing here should ever resolve it at
 * runtime, and the `typeof` guard below is what turns a missing substitution into an
 * explanation rather than a `ReferenceError`.
 */
declare const __APPSHELL_SCOPE__: string;

const scopeOf = (): string => {
  // DefinePlugin folds `typeof __APPSHELL_SCOPE__` at build time, so this collapses to
  // a constant in any build that ran the plugin and survives in any build that did not.
  if (typeof __APPSHELL_SCOPE__ === 'undefined') {
    throw new MissingScopeError();
  }

  return __APPSHELL_SCOPE__;
};

/**
 * This package's runtime configuration, as the registry composed it — the vars the
 * package declared in its `appshell.config.yaml`, with the application's
 * `overrides.vars` layered over them.
 *
 * Throws rather than returning an empty object when nothing was delivered. A package
 * that renders with no configuration at all is the failure this is here to prevent.
 *
 * ```ts
 * import { getVars } from '@appshell/runtime/vars';
 *
 * const { BACKGROUND_COLOR } = getVars<{ BACKGROUND_COLOR: string }>();
 * ```
 */
export const getVars = <TVars extends Vars = Vars>(): TVars => readVars<TVars>(scopeOf());

export { MissingScopeError, MissingVarsError, type Vars } from '@appshell/runtime';
