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
      displayGroup: main
      order: 10
      icon: ViewList

  TestModule/Bar:
    url: ${APPS_TEST_URL}/remoteEntry.js
    metadata:
      route: /bar
      displayName: Bar App
      displayGroup: main
      order: 20
      icon: ViewList

  BizModule/Biz:
    url: http://localhost:4040/remoteEntry.js
    metadata:
      route: /biz
      displayName: Biz App
      displayGroup: auxiliary
      order: 30
      icon: ViewList

vars:
  RUNTIME_ARG_1: ${RUNTIME_ARG_1}
  RUNTIME_ARG_2: ${RUNTIME_ARG_2}
  RUNTIME_ARG_3: ${RUNTIME_ARG_3}
```

> **Note** the variable expansion syntax `${CRA_MFE_URL}`. When the `appshell manifest` is generated the actual runtime environment values are injected.

> **Note** the `vars` section defines runtime configuration values that are injected into the global namespace `window.__appshell_vars__[module_name]` when an Appshell component is loaded. See the examples for a use case.

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
        "displayGroup": "main",
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
        "displayGroup": "main",
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

| Option | Type | Default | Purpose |
| ------ | ---- | ------- | ------- |
| `config` | `string` | `appshell.config.yaml` | Location of the config file |
| `registry` | `string` | CLI context | Registry to publish to |
| `application` | `string` | CLI context | Application to activate the published version in |
| `publish` | `boolean` | `true` in development | Publish after every successful build |
| `force` | `boolean` | `true` in development | Ask the registry to overwrite an existing version whose content differs |

`registry` and `application` are usually omitted — see
[Publishing on build](#publishing-on-build) for the resolution order.

## License

[MIT](./LICENSE)
