import { ModuleFederationLoader } from './types';

/**
 * How to load one component, derived from the Module Federation config that emits it.
 *
 * One definition, used twice: the manifest a publish stores, and the patch an overlay
 * sends. Those describe the same thing from either side of a publish, and two copies of
 * the derivation would disagree the moment one of them changed — the drift being that an
 * overlay addresses a dev server's bundle by a container name the build no longer uses,
 * which surfaces as module federation failing to find a container rather than as anything
 * naming the cause.
 *
 * The federation fields sit under a kind rather than at the top level, so they read as one
 * framework's vocabulary rather than as something generic.
 */
export const loaderOf = (
  module: { shareScope?: string; filename?: string },
  federationKey: string,
): ModuleFederationLoader => {
  const scope = federationKey.replace(/\/.+/, '');

  return {
    apiVersion: 'federation.appshell.org/v1',
    kind: 'ModuleFederation',
    scope,
    module: federationKey.replace(scope, '.'),
    shareScope: module.shareScope,
    // MF's own default when unset. The yaml used to restate it and no longer does.
    filename: module.filename ?? 'remoteEntry.js',
  };
};
