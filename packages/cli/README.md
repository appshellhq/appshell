<div align="center">
  <a href="https://github.com/navaris/appshell">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://github.com/navaris/appshell/blob/main/assets/branding/appshell-logo-white_2x.png">
      <img alt="appshell" src="https://github.com/navaris/appshell/blob/main/assets/branding/appshell-logo_2x.png">
    </picture>
  </a>
</div>

[![Appshell CI](https://github.com/navaris/appshell/actions/workflows/pipeline.yml/badge.svg)](https://github.com/navaris/appshell/actions/workflows/pipeline.yml)

# @appshell/cli

Utility for building micro-frontends with Appshell and Webpack Module federation.

Working examples can be found [here](https://github.com/navaris/appshell/tree/main/examples).

## Getting Started

To begin, you'll need to install `@appshell/cli`:

```console
npm install @appshell/cli --save-dev
```

or

```console
yarn add -D @appshell/cli
```

or

```console
pnpm add -D @appshell/cli
```

## Usage

```bash
appshell [command]

Commands:
  appshell generate [target]           Generates a resource
  appshell config [target]             Configures the appshell cli
  appshell app <target>                Manage appshell applications
  appshell dev                         Point an application at this package running
                                       locally, for this browser only
  appshell login                       Authenticate with an appshell registry
  appshell logout                      Discard the stored credential for a registry
  appshell publish                     Publish a package to the appshell registry
  appshell unpublish <name> <version>  Remove a published package version
  appshell outdated                    Analyzes shared dependencies for outdated versions
```

These global options apply to every command:

| Option | Default | Purpose |
| ------ | ------- | ------- |
| `-r, --registry` | `http://localhost:7070` | Registry to operate against |
| `-a, --application` | — | Application, as `name` or `scope/name` |
| `--scopeId` | `default` | Scope owning unqualified packages and applications |
| `-k, --apiKey` | `""` | Api key, when the registry expects one |
| `-v, --verbose` | `false` | Verbose output |

`--registry` and `--application` fall back to `APPSHELL_REGISTRY` /
`APPSHELL_APPLICATION`, then to `~/.appshell/config`. Set them once instead of
passing them every time:

```bash
appshell config set registry http://localhost:7070
appshell config set application storefront
appshell config list
```

## Vocabulary

| Term | Identity | What it is |
| ---- | -------- | ---------- |
| **Scope** | `acme` | Namespace and permission boundary |
| **Package** | `acme/checkout@1.5.0` | What you publish. Immutable, digest-addressed |
| **Application** | `acme/storefront` | The composition the registry serves |
| **Remote** | `PingModule/Ping` | What the browser loads, over Module Federation |

## Authenticating

```bash
appshell login                       # device flow against the configured issuer
appshell login --clientSecret ...    # client credentials, for CI
appshell logout
```

The token is stored per registry. A registry running `AUTH_MODE=none` needs none —
commands only fail when the registry says so, and a 401 tells you to log in.
`APPSHELL_TOKEN` overrides the stored credential.

## Publishing a package

```bash
appshell publish --template dist/appshell.template.json
```

Publishing is idempotent: the same content under the same version is a no-op.
Different content under an existing version is rejected unless the registry allows
forcing. When `--application` resolves, publish also **activates** the version there.

| Option | When omitted | Purpose |
| ------ | ------------ | ------- |
| `-t, --template` | `appshell.template.json` | Template to process |
| `--name` | the unscoped `package.json` name | Package name |
| `--package-version` | the `package.json` version | Version to publish as |
| `--visibility` | the registry defaults to `private` | Whether other scopes may activate it |
| `-w, --watch` | `false` | Republish whenever the template changes |

```bash
appshell unpublish checkout 1.5.0
```

## Declaring an application

`appshell app apply` reconciles an application against a declared resource, creating
it when absent. It is the declarative counterpart to `app create` plus `publish
--application`, and the same file works against any registry via `--registry`.

**appshell.app.yaml**

```yaml
apiVersion: registry.appshell.org/v1
kind: Application
name: storefront
spec:
  shell:
    root: ContainerModule/Container
    title: Storefront
  packages:
    - acme/checkout@1.5.0
    - acme/cart@2.0.1
```

```bash
appshell app apply -f appshell.app.yaml
```

`spec.packages` is the **full desired set** — anything activated but absent from it is
deactivated, and the command prints what moved:

```
Updated acme/storefront
  activated acme/cart@2.0.1
  deactivated acme/search
```

Omit `spec.packages` entirely and package state is left alone, which is what you want
locally where the webpack plugin already publishes and activates on every build.
`${VAR}` placeholders expand from the environment exactly as they do in
`appshell.config.yaml`.

## Inspecting an application

```bash
appshell app list                     # every application in the scope
appshell app get storefront           # packages, revision, visibility
appshell app composition storefront   # the resolved payload the shell receives
appshell app revisions storefront     # revision history
appshell app rollback storefront --to 3
appshell app open storefront          # print the shell url
```

Every mutation produces a revision, so `revisions` is the audit trail and `rollback`
is how you undo one.

```bash
appshell app create storefront        # imperative equivalent of a bare apply
appshell app delete storefront
appshell app deactivate acme/checkout
appshell app clone --from prod --to my-sandbox
appshell app sync --from prod --to staging --include packages
```

## Developing against a deployed application

`appshell dev` opens an **overlay**: a per-developer, per-browser redirect that points
some of an application's remotes at your machine. It is resolved per request, expires
on its own, and never reaches the application's composition or its revision history.

```bash
appshell dev --port 3002          # redirect this package's remotes at localhost:3002
appshell dev status               # what is open on the application
appshell dev stop --package       # stop redirecting just this package
appshell dev stop <id>            # close one, or --all
```

An overlay can only redirect remote keys the application already publishes — adding
one outright would be a way to run code the application was never composed with. For a
new package, publish and activate it first, or work in a clone.

`--shell dev` additionally serves the development shell build, which is what supports
hot reloading remotes in place.

## Analyzing shared dependencies

```bash
appshell outdated
```

Compares this package's dependencies against the shared-dependency baselines the
application declares, and reports conflicts, missing entries and matches.

## Generate manifest

Processes a template into an appshell manifest. `appshell publish` does this for you;
run it directly when you want the manifest as a build artifact.

```bash
appshell generate manifest --template dist/appshell.template.json
```

| Option | Default | Purpose |
| ------ | ------- | ------- |
| `-t, --template` | `appshell.template.json` | Template to process |
| `-o, --outDir` | `dist` | Output location |
| `-f, --outFile` | `appshell.manifest.json` | Output filename |

**Where does the template come from?**

> Each micro-frontend configured with
> [@appshell/webpack-plugin](https://www.npmjs.com/package/@appshell/webpack-plugin)
> emits `appshell.template.json` at build time. `appshell publish` turns that into a
> manifest and publishes it as a package version.

Sample config template `appshell.template.json`:

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
  },
  "vars": {
    "RUNTIME_ARG_1": "${RUNTIME_ARG_1}",
    "RUNTIME_ARG_2": "${RUNTIME_ARG_2}"
  }
}
```

**How does my runtime environment get reflected in the appshell manifest?**

> Note the variable expansion syntax `${CRA_MFE_URL}`. When `appshell generate manifest` is called the actual runtime environment values are injected in order to produce the remote module's appshell manifest.

> **Note** the `vars` section defines runtime configuration values that are injected into the global namespace `window.__appshell_vars__[module_name]` when an Appshell component is loaded. See the examples for a use case.

Sample appshell manifest produced by the `appshell generate manifest` function:

```json
{
  "remotes": {
    "CraModule/App": {
      "id": "3eb81a0c",
      "url": "http://localhost:3001/remoteEntry.js",
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
      "url": "http://localhost:3002/remoteEntry.js",
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

`appshell publish` sends this manifest to the registry as a package version. The
registry composes every activated package into the payload it serves to the shell.

## Generate runtime env

Captures `process.env` at build time into a script the host loads. This is the host's
own build-time configuration — distinct from a package's `vars`, which the registry
delivers through the composition.

```bash
appshell generate env --prefix APPSHELL_ --outDir dist
```

| Option | Default | Purpose |
| ------ | ------- | ------- |
| `-o, --outDir` | `dist` | Output location |
| `-f, --outFile` | `appshell.env.js` | Output filename |
| `-p, --prefix` | `""` | Only capture variables matching this prefix or regex |
| `-g, --globalName` | `__appshell_env__` | Global the output assigns to |

Sample output `appshell.env.js`:

```js
window.__appshell_env__ = {
  APPSHELL_VAR_1: 'val 1',
  APPSHELL_VAR_2: 'val 2',
};
```

### Using regex to match prefix

```bash
appshell generate env --prefix '^(APPSHELL_|FOO_).*' --outDir dist
```

```js
window.__appshell_env__ = {
  APPSHELL_VAR_1: 'val 1',
  APPSHELL_VAR_2: 'val 2',
  FOO_VAR: 'some value',
};
```

Include it in the public html:

```html
<script src="appshell.env.js"></script>
```
