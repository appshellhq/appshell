/**
 * An npm package name split into where it belongs and what it is called.
 *
 * `@acme/checkout` is scope `acme`, name `checkout`. A bare `checkout` declares no scope
 * and belongs wherever the publisher does.
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
