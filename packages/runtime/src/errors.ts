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
