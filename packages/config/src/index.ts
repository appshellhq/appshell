/**
 * @appshell/config package API
 */
export { default as configmap } from './configmap';
export { persistedContext, resolveContext } from './context';
export type { AppshellContext } from './context';
export {
  clearCredential,
  credentialsPath,
  ensureToken,
  resolveToken,
  saveCredential,
} from './credentials';
export type { Credential } from './credentials';
export { default as generateManifest, manifestFrom } from './generate.manifest';
export { loaderOf } from './loader';
export { default as outdated } from './outdated';
export { activate, openOverlay, publish } from './publish';
export type { OpenedOverlay, OverlayRemotePatch, PublishOptions, PublishResult } from './publish';
export { default as sync } from './sync';
export { caFile, httpsAgent } from './tls';
export type {
  AppshellComposition,
  AppshellConfig,
  AppshellConfigRemote,
  AppshellIndex,
  AppshellManifest,
  AppshellRemote,
  AppshellTemplate,
  AppshellTokenUsage,
  ComparisonResult,
  ComparisonResults,
  ComparisonTarget,
  Metadata,
  ModuleFederationPluginOptions,
  PackageSpec,
  ResolvedRemote,
  Schema,
  SharedConfig,
  SharedModuleSpec,
  SharedObject,
} from './types';
export * as utils from './utils';
export * as validators from './validators';
