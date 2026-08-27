/**
 * The package was built without `AppshellPlugin`, so nothing substituted the scope this
 * module needs to know which vars are its own.
 */
export default class MissingScopeError extends Error {
  constructor() {
    super(
      `Cannot tell which package this is. '@appshell/vars' needs the scope that ` +
        `AppshellPlugin injects at build time — add it to this package's webpack plugins, ` +
        `or read the store directly with readVars(scope) from '@appshell/runtime'.`,
    );

    this.name = 'MissingScopeError';
  }
}
