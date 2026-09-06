/* eslint-disable no-underscore-dangle, @typescript-eslint/naming-convention */
/**
 * Who is looking at the page, as the registry was told by the gateway.
 *
 * Unlike vars this is not scope-specific — there is one visitor per page, not one
 * per package — so it lives in the main entry rather than needing the subpath
 * trick `@appshell/runtime/vars` uses to get a per-package scope substituted.
 *
 * It is also not delivered through the vars store, and that is a constraint rather
 * than a preference: `setVars` freezes on first write and throws on replacement,
 * which is what stops one package overwriting another's configuration. Identity
 * changes — sign-in, sign-out, token refresh — so it cannot live behind a
 * write-once door without either breaking that guarantee or never updating.
 */

/**
 * A discriminated union rather than an optional user, so `username` cannot be read
 * without the anonymous case having been handled. The compiler enforces what a
 * convention would only ask for.
 */
export type Identity =
  | { authenticated: false }
  | { authenticated: true; subject: string; username: string; roles: string[] };

export const ANONYMOUS: Identity = { authenticated: false };

declare global {
  interface Window {
    __appshell_identity__?: unknown;
  }
}

const isIdentity = (value: unknown): value is Identity => {
  if (typeof value !== 'object' || value === null) return false;

  const candidate = value as Record<string, unknown>;

  if (candidate.authenticated === false) return true;

  return (
    candidate.authenticated === true &&
    typeof candidate.subject === 'string' &&
    typeof candidate.username === 'string' &&
    Array.isArray(candidate.roles)
  );
};

/**
 * The visitor, or the anonymous identity when there is none.
 *
 * Never throws and never returns undefined — an absent or malformed value is
 * anonymous, which is a state every caller already has to handle. That is the
 * opposite of `readVars`, which throws when a scope is missing, and the difference
 * is deliberate: a package with no configuration cannot do its job, while a package
 * with no signed-in user usually can and simply renders differently.
 *
 * This is a typed accessor, not a boundary. The value is inlined into the document
 * and any script on the page can read it directly, exactly as with vars. Treat it
 * as what the server said about the visitor, never as proof of anything: it carries
 * no token and grants nothing. Anything that matters is re-checked server-side.
 */
export const getIdentity = (): Identity => {
  if (typeof window === 'undefined') return ANONYMOUS;

  const value = window.__appshell_identity__;

  return isIdentity(value) ? value : ANONYMOUS;
};
