/**
 * @appshell/config package API
 */
export { default as configmap } from './configmap';
export { persistedContext, resolveContext } from './context';
export type { AppshellContext } from './context';
export {
  clearCredential,
  credentialsPath,
  resolveToken,
  saveCredential,
} from './credentials';
export type { Credential } from './credentials';
export { default as generateManifest } from './generate.manifest';
export { default as outdated } from './outdated';
export { activate, publish } from './publish';
export type { PublishOptions, PublishResult } from './publish';
export { default as sync } from './sync';
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
  SharedObject,
  SharedModuleSpec,
} from './types';
export * as utils from './utils';
export * as validators from './validators';
