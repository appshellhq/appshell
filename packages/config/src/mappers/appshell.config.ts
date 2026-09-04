import { createMap, createMapper, forMember, mapFrom, mapWithArguments } from '@automapper/core';
import { pojos, PojosMetadataMap } from '@automapper/pojos';
import { entries } from 'lodash';
import configmap from '../configmap';
import {
  AppshellConfigRemote,
  AppshellManifest,
  AppshellRemote,
  AppshellTemplate,
  ConfigMap,
} from '../types';

const mapper = createMapper({
  strategyInitializer: pojos(),
});

function createMetadata() {
  PojosMetadataMap.create<AppshellTemplate>('AppshellTemplate', {});
  PojosMetadataMap.create<AppshellManifest>('AppshellManifest', {});
}

createMetadata();

const mapAppshellEntrypoint = (
  source: AppshellTemplate,
  key: string,
  remote: AppshellConfigRemote,
) => {
  const moduleName = key.replace(/\/.+/, '');
  const moduleKey = key.replace(moduleName, '.');
  const { id, url, filename } = remote;
  const { shareScope } = source.module;

  return {
    id,
    manifestUrl: `${url}/appshell.manifest.json`,
    remoteEntryUrl: `${url}/${filename}`,
    scope: moduleName,
    module: moduleKey,
    shareScope,
    metadata: remote.metadata,
  };
};

const mapRemotes = (source: AppshellTemplate) =>
  entries(source.remotes).reduce((acc, [key, remote]) => {
    acc[key] = mapAppshellEntrypoint(source, key, remote);
    return acc;
  }, {} as Record<string, AppshellRemote>);

createMap<AppshellTemplate, AppshellManifest>(
  mapper,
  'AppshellTemplate',
  'AppshellManifest',
  forMember(
    (destination) => destination.remotes,
    mapWithArguments((source) => ({
      ...mapRemotes(source),
    })),
  ),
  forMember(
    (destination) => destination.modules,
    mapFrom((source) => ({ [source.module.name || 'unknown']: source.module })),
  ),
  forMember(
    (destination) => destination.vars,
    mapFrom((source) => source.vars),
  ),
  forMember(
    (destination) => destination.tokens,
    mapFrom((source) => source.tokens),
  ),
  forMember(
    (destination) => destination.overrides,
    mapFrom((source) => source.overrides),
  ),
);

// eslint-disable-next-line import/prefer-default-export
export const toAppshellManifest = <TMetadata extends Record<string, unknown>>(
  template: AppshellTemplate,
  args: ConfigMap,
) => {
  const manifest = mapper.map<AppshellTemplate, AppshellManifest<TMetadata>>(
    template,
    'AppshellTemplate',
    'AppshellManifest',
  );

  /*
   * `vars` are deliberately left unsubstituted, while everything else is resolved.
   *
   * The two are unlike things sharing one syntax. `remotes.*.url` is a deployment
   * coordinate — a property of the artifact, known only to whoever built it, and correctly
   * frozen into an immutable version. A var is configuration the running package reads,
   * and resolving it here bakes the build environment into that same immutable version:
   * publish from CI and every other environment inherits CI's values, which are right in
   * exactly one place.
   *
   * It also made the digest lie. `digestOf` hashes the manifest, so the same commit built
   * in two environments published as different content at the same version — an identity
   * that depended on where the build ran.
   *
   * So a `${VAR}` under `vars` stays a placeholder, and that is the declaration: this
   * package reads this name and cannot value it. A literal stays a literal, and that is an
   * honest static default. After an application's `overrides.vars` are layered on, anything
   * still matching `${...}` is precisely the unsupplied set — requiredness is structural
   * rather than declared, so there is no second list to keep in step.
   */
  const { vars } = manifest;

  return { ...configmap.apply({ ...manifest, vars: {} }, args), vars };
};
