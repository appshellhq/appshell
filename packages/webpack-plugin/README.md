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

Then add the plugin to the `webpack` config of each remote app module. For example:

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
so a running `--watch` keeps an environment current as you work. It is **off by default** — nothing
is sent anywhere unless you opt in.

```js
new AppshellPlugin({
  config: './path/to/appshell.config.yaml',
  registry: 'https://registry.example.com',
  environment: 'acme/my-dev', // optional: activate the published version here
  publish: true,
});
```

Every option falls back to an environment variable, which is usually how you enable this — the same
webpack config then publishes in a dev loop or in CI without being edited:

| Option        | Variable                    | Notes                                                                               |
| ------------- | --------------------------- | ----------------------------------------------------------------------------------- |
| `publish`     | `APPSHELL_PUBLISH_ON_BUILD` | Any non-empty value opts in                                                         |
| `registry`    | `APPSHELL_REGISTRY`         | Required when publishing                                                            |
| `environment` | `APPSHELL_ENVIRONMENT`      | Joined with `APPSHELL_SCOPE_ID` as `scope/name`; omit to publish without activating |
| `force`       | —                           | Overwrite a changed version; defaults to `true` in dev mode                         |
| —             | `APPSHELL_TOKEN`            | Bearer token. Never a plugin option                                                 |

`environment` and `APPSHELL_SCOPE_ID` mirror the CLI: set `APPSHELL_ENVIRONMENT=dev` and
`APPSHELL_SCOPE_ID=acme` and the plugin activates in `acme/dev`. Pass an explicit `scope/name` to
either the option or `APPSHELL_ENVIRONMENT` to override.

The app is published under its **npm** name and version, unscoped — the registry takes the scope
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
    url: ${APPS_TEST_URL}/remoteEntry.js # Environment variables will be expanded when the global runtime manifest is generated.
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

environment:
  RUNTIME_ARG_1: ${RUNTIME_ARG_1}
  RUNTIME_ARG_2: ${RUNTIME_ARG_2}
  RUNTIME_ARG_3: ${RUNTIME_ARG_3}
```

> **Note** the variable expansion syntax `${CRA_MFE_URL}`. When the `appshell manifest` is generated the actual runtime environment values are injected.

> **Note** the `environment` section defines runtime environment variables that are injected into the global namesapce `window.__appshell_env__[module_name]` when an Appshell component is loaded. See the examples for a use case.

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
  "environment": {
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

- [`config`](#config)

#### `config`

Type:

```ts
type config = string;
```

Default: `appshell.config.yaml`

Location of the `appshell.config.yaml` file.

## License

[MIT](./LICENSE)
