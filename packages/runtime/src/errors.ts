/* eslint-disable max-classes-per-file */
/**
 * A package asked for vars that were never delivered.
 *
 * Almost always one of three things: the package was loaded outside `remoteLoader`
 * (a test, a storybook, a direct import), the host and the package resolved separate
 * copies of `@appshell/runtime` because one of them failed to declare it as a
 * singleton, or the scope compiled into the package is not the scope the registry
 * knows it by.
 */
export class MissingVarsError extends Error {
  readonly scope: string;

  constructor(scope: string, known: string[]) {
    super(
      `No vars were delivered for '${scope}'. ${
        known.length
          ? `Vars are present for ${known.map((s) => `'${s}'`).join(', ')} — check that ` +
            `'${scope}' matches the module federation name the registry knows this package by.`
          : `Nothing has delivered vars on this page — check that the host and this package ` +
            `both declare '@appshell/runtime' as a shared singleton.`
      }`,
    );

    this.name = 'MissingVarsError';
    this.scope = scope;
  }
}

/**
 * Something tried to replace vars that were already delivered for a scope.
 *
 * The first write wins and is final. Within one page load a scope has exactly one
 * vars object — both resolvers read it from the same `composition.vars[scope]` — so a
 * differing second write is a bug or a package reaching for a scope that is not its own,
 * and neither should be applied quietly.
 */
export class VarsConflictError extends Error {
  readonly scope: string;

  constructor(scope: string) {
    super(
      `Vars for '${scope}' were already delivered and cannot be replaced. ` +
        `A scope receives its vars once per page load.`,
    );

    this.name = 'VarsConflictError';
    this.scope = scope;
  }
}

/**
 * The package was built without `AppshellPlugin`, so nothing substituted the scope the
 * `@appshell/runtime/vars` accessor needs to know which vars are its own.
 */
export class MissingScopeError extends Error {
  constructor() {
    super(
      `Cannot tell which package this is. '@appshell/runtime/vars' needs the scope that ` +
        `AppshellPlugin injects at build time — add it to this package's webpack plugins, ` +
        `or read the store directly with readVars(scope) from '@appshell/runtime'.`,
    );

    this.name = 'MissingScopeError';
  }
}
