/**
 * A package's runtime configuration, already merged by the registry — a package's
 * declared vars, then the application's `overrides.vars`.
 *
 * Structurally identical to `AppshellComposition['vars'][scope]` in `@appshell/config`,
 * but declared here rather than imported. This package is a shared singleton loaded
 * into every micro-frontend on the page, so it carries no dependencies at all.
 */
export type Vars = Record<string, string | number | undefined>;
