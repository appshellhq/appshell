/**
 * @appshell/config package API
 */
export { default as configmap } from './configmap';
export { default as deregister } from './deregister';
export { default as generateEnv } from './generate.env';
export { default as generateGlobalConfig } from './generate.global-config';
export { default as generateManifest } from './generate.manifest';
export { default as outdated } from './outdated';
export { activate, publish } from './publish';
export type { PublishOptions, PublishResult } from './publish';
export { default as register } from './register';
export { default as sync } from './sync';
export type {
  AppshellComposition,
  AppshellConfig,
  AppshellConfigRemote,
  AppshellGlobalConfig,
  AppshellIndex,
  AppshellManifest,
  AppshellRemote,
  AppshellTemplate,
  ComparisonResult,
  ComparisonResults,
  ComparisonTarget,
  Metadata,
  ModuleFederationPluginOptions,
  PackageSpec,
  ResolvedRemote,
  Schema,
  SharedModuleSpec,
} from './types';
export * as utils from './utils';
export * as validators from './validators';
