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

/**
 * How a host loads a remote, named as one kind among possible kinds.
 *
 * scope, module and shareScope are Module Federation's vocabulary, and they used to sit
 * at the top level of a remote where nothing said so — which is what would have made a
 * second framework awkward, not the words themselves. Nested under a kind they are
 * exactly correct, and something like single-spa slots beside them without reinterpreting
 * anything already published.
 *
 * apiVersion follows the house style set by appshell.app.yaml, and the group is appshell's
 * because appshell owns this schema: it decides which fields it stores, even though the
 * fields describe federation concepts. If federation ever needs a different recipe that is
 * a v2, and manifests published under v1 keep meaning what they meant — which matters,
 * because they are immutable and hashed.
 */
export type ModuleFederationLoader = {
  apiVersion: 'federation.appshell.org/v1';
  kind: 'ModuleFederation';
  scope: string;
  module: string;
  shareScope?: string;
  /** The entry file the build emits, conventionally remoteEntry.js. */
  filename: string;
  /**
   * What built this, recorded as a fact rather than a constraint.
   *
   * Deliberately not a version range. A range is a claim about the environment, and a
   * package cannot make it: it knows what built it and not what will load it, and the
   * host is what registers the remote. Freezing one into an immutable artifact is the
   * same mistake as freezing its origin.
   */
  builtWith?: string;
};

export type RemoteLoader = ModuleFederationLoader;

/** A remote the registry has already resolved, so the browser needs no manifest fetch. */
export type AppshellRemote<TMetadata = Metadata> = {
  id: string;
  manifestUrl: string;
  remoteEntryUrl: string;
  loader: RemoteLoader;
  metadata: TMetadata;
};

/** Remote key to manifest url. */
export type AppshellIndex = Record<string, string>;
