/**
 * What the browser is told about a remote.
 *
 * These live here rather than in `@appshell/config` because config is build tooling — it
 * carries yaml, lodash and axios — and a package that only wants to type a remote should
 * not install a compiler to get it. This package is already the one every micro-frontend
 * on the page shares, and it has no dependencies of its own to pass on.
 *
 * `AppshellManifest` deliberately stays in `@appshell/config`. It is a build artifact, and
 * its `modules` field is Module Federation plugin options — build-time webpack
 * configuration the browser never sees and this package should never drag in.
 */

/** Arbitrary, application-defined description of a remote. Appshell never reads it. */
export type Metadata = Record<string, unknown>;

/** A remote the registry has already resolved, so the browser needs no manifest fetch. */
export type AppshellRemote<TMetadata = Metadata> = {
  id: string;
  manifestUrl: string;
  remoteEntryUrl: string;
  scope: string;
  module: string;
  shareScope?: string;
  metadata: TMetadata;
};

/** Remote key to manifest url. */
export type AppshellIndex = Record<string, string>;
