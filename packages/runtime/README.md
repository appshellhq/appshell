# @appshell/runtime

The store that delivers a package's runtime configuration (`vars`) to it.

This is a **shared singleton**. There is exactly one instance per page, held in the
module federation share scope, and both the host and every package must declare it as
such. It replaced `window.__appshell_vars__<scope>`.

Most packages should not import this directly — use
[`@appshell/vars`](../vars/README.md), which supplies the scope for you.

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
