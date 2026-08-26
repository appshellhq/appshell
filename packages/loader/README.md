<div align="center">
  <a href="https://github.com/navaris/appshell">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://github.com/navaris/appshell/blob/main/assets/branding/appshell-logo-white_2x.png">
      <img alt="appshell" src="https://github.com/navaris/appshell/blob/main/assets/branding/appshell-logo_2x.png">
    </picture>
  </a>
</div>

[![Appshell CI](https://github.com/navaris/appshell/actions/workflows/pipeline.yml/badge.svg)](https://github.com/navaris/appshell/actions/workflows/pipeline.yml)

# @appshell/loader

Dynamically load Appshell components for micro-frontends built with Appshell and Webpack Module federation.

Working examples can be found [here](https://github.com/navaris/appshell/tree/main/examples).

## Getting Started

To begin, you'll need to install `@appshell/loader`:

```console
npm install @appshell/loader --save-dev
```

or

```console
yarn add -D @appshell/loader
```

or

```console
pnpm add -D @appshell/loader
```

The default export from this package is the loader function. It is given the global appshell configuration, and returns an async function that can be called to dynamically load Appshell components.

```ts
import componentLoader from '@appshell/loader';

const load = componentLoader();

const Component = load<MyComponent>('MyModule/MyComponent');

render(<Component />);
```

**Where does the composition come from?**

> The registry inlines it into the document it serves, as `window.__appshell_config__`.

## How a remote is resolved

The loader walks a chain of resolvers and uses the first one that answers:

| Resolver           | Source                                    | When it answers                                                            |
| ------------------ | ----------------------------------------- | -------------------------------------------------------------------------- |
| `inlineResolver`   | `window.__appshell_config__`              | The registry served the page and inlined the composition. No network call. |
| `registryResolver` | `GET /v1/applications/:id/remotes/:key`   | The remote was activated after this page was served.                       |

A package's vars reach `window.__appshell_vars__<scope>` already merged with the
application's overrides, because the registry does that merge server side. The browser
applies nothing.

You can bypass the chain entirely, which is mainly useful for tests and embedders:

```ts
const load = componentLoader({ resolver: myResolver });
```

**Do you have any framework specific loaders?**

> See [@appshell/react](https://www.npmjs.com/package/@appshell/react) for a `React` loader.
