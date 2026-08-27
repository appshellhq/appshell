# @appshell/vars

Reads the runtime configuration the registry composed for this package.

```ts
import { getVars } from '@appshell/vars';

const { BACKGROUND_COLOR } = getVars<{ BACKGROUND_COLOR: string }>();
```

No scope argument: `AppshellPlugin` substitutes the package's module federation name at
build time, so `getVars()` can only ever return this package's own vars. Throws
`MissingVarsError` if nothing was delivered and `MissingScopeError` if the package was
built without the plugin.

The vars themselves are whatever the registry composed — declared in this package's
`appshell.config.yaml`, with the application's `overrides.vars` layered over them. The
browser applies nothing.

## Setup

`AppshellPlugin` in the package's webpack plugins (which supplies the scope), and
`@appshell/runtime` declared as a shared singleton (which is where the vars actually
live):

```js
new ModuleFederationPlugin({
  shared: {
    '@appshell/runtime': { singleton: true },
  },
});
```

## Why this is a separate package, and why it is not bundled

Two constraints that pull apart:

- The **store** has to be one instance for the whole page, so it is shared.
- The **accessor** has to know which package is calling. A shared module cannot — it is
  one instance serving everyone. `DefinePlugin` substitutes at the *call site*, in the
  consuming package's own compilation, so whatever reads the injected scope has to be
  compiled into each package rather than shared.

Hence: shared store, unshared accessor.

That also means this package is built with `tsc` alone, unlike every other package here,
which webpack-bundles. Bundling would inline `@appshell/runtime` into this package's
`dist`, leaving no `@appshell/runtime` request for module federation to intercept — every
package would get a private copy of the store, and none of them would have any vars in it.
The plain `require('@appshell/runtime')` that `tsc` emits is the point.
