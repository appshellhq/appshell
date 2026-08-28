# @appshell/runtime

The store that delivers a package's runtime configuration (`vars`) to it.

This is a **shared singleton**. There is exactly one instance per page, held in the
module federation share scope, and both the host and every package must declare it as
such. It replaced `window.__appshell_vars__<scope>`.

Most packages should not import this directly — use `@appshell/runtime/vars` below,
which supplies the scope for you.

## `@appshell/runtime/vars`

The accessor most packages actually want. It reads *this* package's vars, with no scope
to pass and no way to name someone else's:

```ts
import { getVars } from '@appshell/runtime/vars';

const { BACKGROUND_COLOR } = getVars<{ BACKGROUND_COLOR: string }>();
```

It is a subpath rather than a main-entry export for a reason. `AppshellPlugin` compiles
the package's own scope into whatever imports it, and the main entry is the *shared*
module — one instance for the whole page — so a scope baked in there would be one
package's, and every other package would read the wrong vars.

The exact-match share key `'@appshell/runtime'` does not catch `'@appshell/runtime/vars'`,
so each package bundles its own copy of the accessor with its own scope, while the store
they all reach stays the single shared instance.

`getVars` throws `MissingScopeError` when the package was built without `AppshellPlugin`,
since nothing substituted the scope.

## Contract

```ts
setVars(scope, vars); // the host, immediately before loading a remote
readVars(scope); // a package, reading its own configuration
hasVars(scope); // branch instead of catch
```

`@appshell/loader` calls `setVars` before it loads a remote, so a package's vars are in
place before its modules evaluate — including a read at module-eval time.

The first write for a scope wins and is frozen. Re-delivering the identical vars is a
no-op, because the same remote can be mounted more than once; replacing them throws
`VarsConflictError`.

`readVars` throws `MissingVarsError` rather than returning an empty object. A package
that silently renders with no configuration is the failure this replaced.

## What this does and does not fix

Against the global it replaced, it fixes: unbounded, never-cleaned-up keys; silent
cross-package overwrite; the load-order coupling between host and remote; and being
untyped and undiscoverable.

It **does not make a scope's vars private.** Any code on the page can call
`readVars('SomeOtherScope')`, and a package that loads early can squat on a scope that
has not been delivered yet. Nothing short of a separate realm — an iframe, a worker —
would change that, and none of this is a security boundary. Do not put a secret in
`vars`; the registry serves them to the browser in the composition either way.

## Setup

Both sides declare it, or each ends up with its own empty store:

```js
new ModuleFederationPlugin({
  shared: {
    '@appshell/runtime': { singleton: true },
  },
});
```

`AppshellPlugin` fails the build when a package omits it.
