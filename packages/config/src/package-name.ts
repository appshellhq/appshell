/**
 * An npm package name split into where it belongs and what it is called.
 *
 * `@acme/checkout` is scope `acme`, name `checkout`. A bare `checkout` declares no scope,
 * and `packageScope` says where it goes.
 *
 * One definition because three places used to strip the scope with their own copy of the
 * same regular expression — the cli's `identify`, its workspace scan, and the webpack
 * plugin. Three copies of a rule about identity is three chances for a package to publish
 * to a different place than the tooling thinks it does.
 *
 * Scope is worth declaring for the reason it is worth checking in: `@acme/checkout` says
 * where it belongs in a file under review, identically for everyone, rather than landing
 * in whichever namespace the person running the publish happens to carry.
 */
export type PackageName = { scopeId?: string; name: string };

const SCOPED = /^@([^/]+)\/(.+)$/;

export const parsePackageName = (raw: string): PackageName => {
  const scoped = SCOPED.exec(raw);

  return scoped ? { scopeId: scoped[1], name: scoped[2] } : { name: raw };
};

/**
 * Where a package publishes, and so where a dev server overlays it: the scope its name
 * declares, else the configured default scope, else none, for the registry to put it in the
 * publisher's own. appshellhq/appshell-services#125.
 *
 * One rule for every path. Publishing used to ignore the default scope that overlays and
 * every lookup honour, so an unqualified `checkout` published into the publisher's own scope
 * and was then looked for in the default one. And an identity provider whose usernames are
 * email addresses gives an account no own scope at all, so the default is the only way to
 * publish an unscoped package there.
 */
export const packageScope = (
  declared: string | undefined,
  defaultScope: string | undefined,
): string | undefined => declared || defaultScope || undefined;
