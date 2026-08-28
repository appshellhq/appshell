/**
 * @appshell/webpack-plugin package API
 */

// eslint-disable-next-line import/prefer-default-export
export type { AppshellManifest } from '@appshell/config';
export { default as AppshellPlugin } from './AppshellPlugin';
export { DEV_HINT_FILE, DEV_HINT_VERSION, devServerOrigin, writeDevHint } from './devHint';
export type { DevHint } from './devHint';
export { appshellShared, type AppshellSharedOptions } from './shared';
