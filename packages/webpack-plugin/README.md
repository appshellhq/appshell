<div align="center">
  <a href="https://github.com/navaris/appshell">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://github.com/navaris/appshell/blob/main/assets/branding/appshell-logo-white_2x.png">
      <img alt="appshell" src="https://github.com/navaris/appshell/blob/main/assets/branding/appshell-logo_2x.png">
    </picture>
  </a>
</div>

[![Appshell CI](https://github.com/navaris/appshell/actions/workflows/pipeline.yml/badge.svg)](https://github.com/navaris/appshell/actions/workflows/pipeline.yml)

# @appshell/webpack-plugin

Emits an appshell manifest template for building micro-frontends with Appshell and Webpack Module Federation. The appshell manifest template is subseqently processed to generate an `appshell manifest`.

Working examples can be found [here](https://github.com/navaris/appshell/tree/main/examples).

## Getting Started

To begin, you'll need to install `@appshell/webpack-plugin`:

```console
npm install @appshell/webpack-plugin --save-dev
```

or

```console
yarn add -D @appshell/webpack-plugin
```

or

```console
pnpm add -D @appshell/webpack-plugin
```

Then add the plugin to the `webpack` config of each remote package. For example:

**webpack.config.js**

```js
const { AppshellPlugin } = require('@appshell/webpack-plugin');

module.exports = {
  plugins: [
    new AppshellPlugin({
      config: './path/to/appshell.config.yaml',
    }),
  ],
};
```

## A remote's configuration: `appshellRemote()`

Most of a remote's webpack configuration isn't the author's choice: the registry and
`@appshell/react-shell` require it of every remote. `appshellRemote()` returns that part, and you
extend it with your own loaders, usually with `webpack-merge`. It needs
`@module-federation/enhanced` installed beside it.

```js
const { merge } = require('webpack-merge');
const { appshellRemote } = require('@appshell/webpack-plugin');
const { dependencies } = require('./package.json');

module.exports = (_env, { mode }) =>
  merge(
    appshellRemote({
      name: 'PackagesModule',
      exposes: { './Packages': './src/Packages' },
      port: 7302,
      mode,
      react: true,
      dependencies,
    }),
    {
      resolve: { extensions: ['.js', '.ts', '.tsx'] },
      module: {
        rules: [
          /* your transpiler, your CSS */
        ],
      },
    },
  );
```

What it sets, and what requires it:

| Setting                                                                    | Required by                                                                                                                                                                                           |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source maps without `eval` in development                                  | The registry serves the shell page under a CSP that forbids `eval`, so development's default source maps throw before the remote runs.                                                                |
| `publicPath: 'auto'`                                                       | The registry serves a remote's files under `/p/<scope>/<name>/<version>/` on the application's own origin, and an overlay serves them from a dev server: the path is known only once the entry loads. |
| Content-hashed chunks, an unhashed `remoteEntry.js`                        | A chunk's name names its bytes, so nothing pairs a fresh entry with a stale chunk. The entry is the file the published manifest names.                                                                |
| A dev server with CORS, `allowedHosts`, and a reload socket on `localhost` | Overlays: the page is on the application's origin and the code on `localhost`. The server binds every interface and would otherwise bake `0.0.0.0`, which no browser can dial, into its client.       |
| `ModuleFederationPlugin` with `appshellShared`                             | `@appshell/react-shell` is the federation host and shares appshell's runtime, and with `react`, React and its bindings, as singletons.                                                                |
| `AppshellPlugin`                                                           | Writes the manifest a publish sends.                                                                                                                                                                  |

**Defaults you can override:**

- The dev server covers the page only for build errors: warnings stay in the terminal, and an error thrown by something else on the page, such as a browser extension, isn't the remote's.
- `allowedHosts` is `'all'`, since the dev server already answers every origin with CORS. Name your applications' hosts to narrow it, for example `['.appshell.org']`.
- The one warning `@appshell/react`'s bundle causes, from its federation runtime's dynamic import, is ignored.

**Not included**, because they're yours: a transpiler, CSS and testing. A container's own
contract isn't included either. The workspace's `react-router` singleton, for example, is added
through `shared` by the remotes that contribute to it:

```js
appshellRemote({ …, shared: { 'react-router': { singleton: true, requiredVersion: dependencies['react-router'] } } });
```

| Option         | Default                  | Meaning                                                               |
| -------------- | ------------------------ | --------------------------------------------------------------------- |
| `name`         |                          | The federation container's name, the scope its manifest names.        |
| `exposes`      |                          | What it exposes, as `ModuleFederationPlugin` takes it.                |
| `port`         |                          | The dev server's port, for an overlay to point at.                    |
| `mode`         |                          | webpack's mode, as its CLI passes it to a config function.            |
| `react`        | `false`                  | Share React and appshell's React bindings.                            |
| `dependencies` | `{}`                     | Usually `package.json`'s `dependencies`, which pin the shared ranges. |
| `shared`       | `{}`                     | Shared beyond appshell's preset, merged last.                         |
| `entry`        | the first exposed module | The build's entry.                                                    |
| `uniqueName`   | `name`                   | `output.uniqueName`, which keeps two remotes' chunks apart.           |
| `allowedHosts` | `'all'`                  | The hosts allowed to open the dev server's reload socket.             |
| `plugin`       |                          | Options for `AppshellPlugin`.                                         |

## Publishing on build

The plugin can publish the generated manifest to an Appshell registry after every successful build,
so a running `--watch` keeps an application current as you work. **Development builds publish by
default** — you never toggle it per project — while production builds never publish on their own.

```js
new AppshellPlugin({
  config: './path/to/appshell.config.yaml',
  // registry / application are usually omitted — see below.
  registry: 'https://registry.example.com', // optional override
  application: 'acme/my-dev', // optional: activate the published version here
});
```

By default the plugin defers to your **CLI context** — the registry, application, and token you set
with `appshell config set` and `appshell login` (stored in `~/.appshell`). That's the same context
the CLI uses, so one machine-level setting drives both; a project needs no per-repo configuration.

Resolution precedence, per field: explicit plugin option → `APPSHELL_*` env var → `~/.appshell`
context → default. When an option or env var points somewhere other than your persisted context, the
plugin warns that it is overriding it.

| Field       | Option        | Env var                     | Notes                                                                                 |
| ----------- | ------------- | --------------------------- | ------------------------------------------------------------------------------------- |
| publish     | `publish`     | `APPSHELL_PUBLISH_ON_BUILD` | Defaults to `true` in development mode; set `0`/`false` to opt out                    |
| registry    | `registry`    | `APPSHELL_REGISTRY`         | From CLI context by default                                                           |
| application | `application` | `APPSHELL_APPLICATION`      | `scope/name` (or joined with `APPSHELL_SCOPE_ID`); omit to publish without activating |
| force       | `force`       | —                           | Overwrite a changed version; defaults to `true` in dev mode                           |
| token       | —             | `APPSHELL_TOKEN`            | Otherwise from `~/.appshell/credentials`; never a plugin option                       |

In CI there is no `~/.appshell`, so `APPSHELL_REGISTRY`, `APPSHELL_APPLICATION`, and `APPSHELL_TOKEN`
are the whole story. If publishing defaults on in development but no registry is resolvable, the build
still succeeds — publishing is skipped with a warning.

The package is published under its **npm** name and version, unscoped — the registry takes the scope
from your token. Publishing the same content twice is a no-op, so a watch loop that rebuilds without
a version bump is harmless. Publishing _different_ content under an existing version is normally
rejected; in development mode the plugin asks the registry to overwrite it, which a local (unauthenticated)
registry honors by default and a real registry refuses unless configured with `ALLOW_FORCE_PUBLISH`.

A failed publish is reported as a compilation error rather than thrown, so `--watch` reports it and
keeps running.

**What is appshell.config.yaml?**

> A configuration file consumed by the plugin to provide additional information and context to the Appshell host about remote entrypoints, routing, display names, etc.

Sample appshell.config.yaml

```yaml
remotes:
  TestModule/Foo: # Must match the scope/module defined in ModuleFederationPlugin
    url: ${APPS_TEST_URL}/remoteEntry.js # Application variables will be expanded when the global runtime manifest is generated.
    metadata: # Use metadata to provide additional information
      route: ${FOO_ROUTE}
      displayName: Foo App
      displayGroup: primary
      order: 10
      icon: ViewList

  TestModule/Bar:
    url: ${APPS_TEST_URL}/remoteEntry.js
    metadata:
      route: /bar
      displayName: Bar App
      displayGroup: primary
      order: 20
      icon: ViewList

  BizModule/Biz:
    url: http://localhost:4040/remoteEntry.js
    metadata:
      route: /biz
      displayName: Biz App
      displayGroup: utility
      order: 30
      icon: ViewList

vars:
  RUNTIME_ARG_1: ${RUNTIME_ARG_1}
  RUNTIME_ARG_2: ${RUNTIME_ARG_2}
  RUNTIME_ARG_3: ${RUNTIME_ARG_3}
```

> **Note** the variable expansion syntax `${CRA_MFE_URL}`. When the `appshell manifest` is generated the actual runtime environment values are injected.

> **Note** the `vars` section defines runtime configuration values a package reads with `getVars()` from [`@appshell/runtime/vars`](../runtime/README.md) once it is loaded. The package must share `@appshell/runtime` as a singleton to receive them. See the examples for a use case.

**What happens at build time?**

> The plugin emits a manifest template file that is subsequently used to generate the `appshell manifest` at runtime.

## Sample output

```json
{
  "remotes": {
    "CraModule/App": {
      "url": "${CRA_MFE_URL}",
      "metadata": {
        "route": "/cra",
        "displayName": "Example App",
        "displayGroup": "${CRA_MFE_DISPLAY_GROUP}",
        "order": 10,
        "icon": "ViewList"
      },
      "id": "3eb81a0c"
    }
  },
  "module": {
    "exposes": {
      "./App": "./src/App"
    },
    "filename": "remoteEntry.js",
    "name": "CraModule",
    "shared": {
      "react": {
        "singleton": true,
        "requiredVersion": "^18.2.0"
      },
      "react-dom": {
        "singleton": true,
        "requiredVersion": "^18.2.0"
      }
    }
  }
}
```

**How do I generate the appshell manifest?**

> Use [@appshell/cli](https://www.npmjs.com/package/@appshell/config) in a startup script:

```bash
appshell generate manifest --template appshell.template.json
```

Sample `appshell manifest`:

```json
{
  "remotes": {
    "CraModule/App": {
      "id": "3eb81a0c",
      "url": "http://localhost:3000/remoteEntry.js",
      "scope": "CraModule",
      "module": "./App",
      "metadata": {
        "route": "/cra",
        "displayName": "Example App",
        "displayGroup": "primary",
        "order": 10,
        "icon": "ViewList"
      }
    },
    "VanillaModule/Vanilla": {
      "id": "8232ce86",
      "url": "http://localhost:5000/remoteEntry.js",
      "scope": "VanillaModule",
      "module": "./Vanilla",
      "metadata": {
        "route": "/vanilla",
        "displayName": "Example React App",
        "displayGroup": "primary",
        "order": 10,
        "icon": "ViewList"
      }
    }
  },
  "modules": {
    "Appshell": {
      "name": "Appshell",
      "shared": {
        "react": {
          "singleton": true,
          "requiredVersion": "^18.2.0"
        },
        "react-dom": {
          "singleton": true,
          "requiredVersion": "^18.2.0"
        }
      }
    },
    "CraModule": {
      "exposes": {
        "./App": "./src/App"
      },
      "filename": "remoteEntry.js",
      "name": "CraModule",
      "shared": {
        "react": {
          "singleton": true,
          "requiredVersion": "^18.2.0"
        },
        "react-dom": {
          "singleton": true,
          "requiredVersion": "^18.2.0"
        }
      }
    },
    "VanillaModule": {
      "exposes": {
        "./Vanilla": "./src/App"
      },
      "filename": "remoteEntry.js",
      "name": "VanillaModule",
      "shared": {
        "react": {
          "singleton": true,
          "requiredVersion": "^18.2.0"
        },
        "react-dom": {
          "singleton": true,
          "requiredVersion": "^18.2.0"
        }
      }
    }
  },
  "vars": {
    "CraModule": {
      "RUNTIME_ARG_1": "Foo",
      "RUNTIME_ARG_2": "Biz"
    },
    "VanillaModule": {
      "RUNTIME_ARG_1": "Bar"
    }
  }
}
```

## Options

- **[`options`](#options-1)**

The plugin's signature:

**webpack.config.js**

```js
const { AppshellPlugin } = require('@appshell/webpack-plugin');

module.exports = {
  plugins: [
    new AppshellPlugin({
      config: './path/to/appshell.config.yaml',
    }),
  ],
};
```

### `Options`

| Option        | Type      | Default                | Purpose                                                                 |
| ------------- | --------- | ---------------------- | ----------------------------------------------------------------------- |
| `config`      | `string`  | `appshell.config.yaml` | Location of the config file                                             |
| `registry`    | `string`  | CLI context            | Registry to publish to                                                  |
| `application` | `string`  | CLI context            | Application to activate the published version in                        |
| `publish`     | `boolean` | `true` in development  | Publish after every successful build                                    |
| `force`       | `boolean` | `true` in development  | Ask the registry to overwrite an existing version whose content differs |

`registry` and `application` are usually omitted — see
[Publishing on build](#publishing-on-build) for the resolution order.

## License

[MIT](./LICENSE)
