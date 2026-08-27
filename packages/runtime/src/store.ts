import { MissingVarsError, VarsConflictError } from './errors';
import type { Vars } from './types';

/**
 * One map per page, because this module is a shared singleton. Keyed by federation
 * scope, which is the only identity the host and the package agree on.
 */
const delivered = new Map<string, Readonly<Vars>>();

/** Order-independent: vars are flat, one level of string/number/undefined. */
const same = (a: Vars, b: Vars) => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);

  return [...keys].every((key) => a[key] === b[key]);
};

/**
 * Delivers a scope's vars. Called by `@appshell/loader` immediately before the remote
 * is loaded, so they are in place before the package's modules evaluate.
 *
 * The first write for a scope wins and is frozen. Re-delivering the identical vars is a
 * no-op — the same remote can be mounted more than once — but replacing them throws.
 * That is what keeps one package from overwriting another's: by the time any package
 * evaluates, the host has already written for it.
 *
 * It does not make a scope's vars *private*. Any code on the page can still read another
 * scope by name, and nothing short of a separate realm would change that.
 */
export const setVars = (scope: string, vars: Vars): void => {
  const existing = delivered.get(scope);

  if (existing) {
    if (!same(existing, vars)) {
      throw new VarsConflictError(scope);
    }

    return;
  }

  delivered.set(scope, Object.freeze({ ...vars }));
};

/**
 * Reads a scope's vars, throwing rather than handing back an empty object — a package
 * that silently renders with no configuration is the failure this replaced.
 *
 * Prefer `getVars()` from `@appshell/vars`, which supplies the scope for you.
 */
export const readVars = <TVars extends Vars = Vars>(scope: string): TVars => {
  const vars = delivered.get(scope);

  if (!vars) {
    throw new MissingVarsError(scope, [...delivered.keys()]);
  }

  return vars as TVars;
};

/** Whether a scope has been delivered, for callers that want to branch instead of catch. */
export const hasVars = (scope: string): boolean => delivered.has(scope);

/** Test seam. Not part of the contract a package should build on. */
export const resetVars = (): void => {
  delivered.clear();
};
