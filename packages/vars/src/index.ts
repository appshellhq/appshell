/* eslint-disable no-underscore-dangle, @typescript-eslint/naming-convention */
import { readVars, type Vars } from '@appshell/runtime';
import MissingScopeError from './errors';

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
 * import { getVars } from '@appshell/vars';
 *
 * const { BACKGROUND_COLOR } = getVars<{ BACKGROUND_COLOR: string }>();
 * ```
 */
export const getVars = <TVars extends Vars = Vars>(): TVars => readVars<TVars>(scopeOf());

export { MissingVarsError, type Vars } from '@appshell/runtime';
export { default as MissingScopeError } from './errors';
