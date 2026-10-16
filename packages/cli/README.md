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
  appshell unpublish <name> <version>  Remove a published package version, restorable for
                                       the registry's window (30 days by default)
  appshell restore <name> <version>    Bring back an unpublished version inside its window
  appshell purge <name> <version>      Drop an unpublished version's content for good
                                       (needs --yes)
  appshell trust                       Trust CI workflows to publish into a scope, or
                                       workloads to apply its applications, without a
                                       stored secret
  appshell outdated                    Analyzes shared dependencies for outdated versions
```

These global options apply to every command:

| Option              | Default                 | Purpose                                            |
| ------------------- | ----------------------- | -------------------------------------------------- |
| `-r, --registry`    | `http://localhost:7070` | Registry to operate against                        |
| `-a, --application` | —                       | Application, as `name` or `scope/name`             |
| `--scopeId`         | `default`               | Scope owning unqualified packages and applications |
| `-k, --apiKey`      | `""`                    | Api key, when the registry expects one             |
| `-v, --verbose`     | `false`                 | Verbose output                                     |

`--registry` and `--application` fall back to `APPSHELL_REGISTRY` /
`APPSHELL_APPLICATION`, then to `~/.appshell/config`. Set them once instead of
passing them every time:

```bash
appshell config set registry http://localhost:7070
appshell config set application storefront
appshell config list
```

## Vocabulary

| Term            | Identity              | What it is                                     |
| --------------- | --------------------- | ---------------------------------------------- |
| **Scope**       | `acme`                | Namespace and permission boundary              |
| **Package**     | `acme/checkout@1.5.0` | What you publish. Immutable, digest-addressed  |
| **Application** | `acme/storefront`     | The composition the registry serves            |
| **Remote**      | `PingModule/Ping`     | What the browser loads, over Module Federation |

## Authenticating

```bash
appshell login                       # device flow against the configured issuer
appshell login --clientSecret ...    # client credentials, for CI
appshell logout
```

The token is stored per registry. A registry running `AUTH_MODE=none` needs none —
commands only fail when the registry says so, and a 401 tells you to log in.
`APPSHELL_TOKEN` overrides the stored credential. A GitHub Actions job can publish with
neither — see [Trusted publishing](#trusted-publishing).

## Publishing a package

```bash
appshell publish --template dist/appshell.template.json
```

Publishing is idempotent: the same content under the same version is a no-op.
Different content under an existing version is rejected unless the registry allows
forcing. When `--application` resolves, publish also **activates** the version there.

| Option              | When omitted                       | Purpose                                 |
| ------------------- | ---------------------------------- | --------------------------------------- |
| `-t, --template`    | `appshell.template.json`           | Template to process                     |
| `--name`            | the unscoped `package.json` name   | Package name                            |
| `--package-version` | the `package.json` version         | Version to publish as                   |
| `--visibility`      | the registry defaults to `private` | Whether other scopes may activate it    |
| `-w, --watch`       | `false`                            | Republish whenever the template changes |

```bash
appshell unpublish checkout 1.5.0
```

Unpublishing takes the version out of every read, but the registry keeps its content for a
window, 30 days unless it is configured otherwise. It refuses a version an application has
activated. The output says until when the version can be restored, and how:

```bash
appshell packages unpublished checkout   # what can still be restored, and until when
appshell restore checkout 1.5.0          # back exactly as it was, same digest
appshell purge checkout 1.5.0 --yes      # gone for good; only after an unpublish
```

The version's coordinates stay spent either way: the same version can't be published again
with other content.

## Trusted publishing

A GitHub Actions workflow can publish into a scope with its own OIDC identity, so no
secret is stored anywhere. The scope's owner — or an organization admin, for a scope an
organization owns — records which workflow may:

```bash
appshell trust add acme --github acme/widgets --workflow pipeline.yml --environment production
appshell trust list acme
appshell trust remove acme 1b2c3d4e     # the id as `list` shows it
```

`trust add` looks the repository up on GitHub and records it by its immutable ids, so a
renamed or transferred repository, or a new one taking the old name, does not inherit the
trust. Set `GITHUB_TOKEN` (or `GH_TOKEN`) to look up a private repository; `--github-api
https://<host>/api/v3` and `--issuer` cover GitHub Enterprise Server. Naming an
`--environment` is recommended: its protection rules then decide which branches and
reviewers can publish.

The workflow needs `id-token: write` and the registry's address, nothing else:

```yaml
permissions: { id-token: write, contents: read }
env: { APPSHELL_REGISTRY: https://registry.appshell.org }
jobs:
  publish:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      # ...build...
      - run: npx appshell publish
```

With no `APPSHELL_TOKEN` and no stored login for the registry, `appshell publish` asks the
runner for a token whose audience is the registry url as configured, without a trailing
slash — the registry's `TRUSTED_PUBLISHING_AUDIENCE` must be exactly that — and presents
it for that one request. Each publish mints its own and none is stored. An explicit
`APPSHELL_TOKEN` or stored login wins, so a job that sets one publishes as that account.

The package must name its scope, as `@acme/widgets`: a workflow has no namespace of its
own. A refusal says what to check — `appshell trust list <scope>` and the job's
environment, or that the registry does not have trusted publishing enabled, in which case
publish retries once without a token for a registry that needs none (`AUTH_MODE=none`).

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

## Trusted deployment

A workload can apply an application with its own OIDC identity, so the job or controller
that keeps it at its declared state holds no secret either: a GitHub Actions workflow, or
a Kubernetes service account. The application's scope owner, or an organization admin,
records which workload may — the application must exist first:

```bash
# A GitHub Actions workflow, by repository ids as for publishing
appshell trust add acme --application storefront \
  --github acme/deploy --workflow deploy.yml --environment production

# A Kubernetes service account, under its cluster's OIDC issuer
appshell trust add acme --application storefront \
  --kubernetes https://oidc.eks.us-east-1.amazonaws.com/id/EXAMPLE \
  --namespace appshell --service-account deployer

appshell trust list acme --application storefront
appshell trust remove acme 1b2c3d4e --application storefront
```

The cluster issuer is taken exactly as given and must be what the cluster's service
account tokens carry (`kubectl get --raw /.well-known/openid-configuration` prints it). The
registry fetches its keys from there, so the issuer's discovery document must be public:
EKS, GKE and AKS serve one, and a self-managed cluster must publish its own discovery
document and keys at a public https address.

**From GitHub Actions**, with `id-token: write` and no `APPSHELL_TOKEN` or stored login,
`appshell app apply` asks the runner for a token for the registry's deploy audience — the
registry url with `/deploy`, or `APPSHELL_DEPLOY_AUDIENCE` when the registry's operator set
`TRUSTED_DEPLOYMENT_AUDIENCE` to something else — and applies with it:

```yaml
permissions: { id-token: write, contents: read }
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - run: npx appshell app apply -f appshell.app.yaml --registry https://registry.appshell.org
```

**From Kubernetes**, project a token for that audience into the pod, running as the
trusted service account, and present it to the same registry:

```yaml
spec:
  serviceAccountName: deployer
  containers:
    - name: apply
      # ...
      volumeMounts:
        - name: appshell-token
          mountPath: /var/run/appshell
          readOnly: true
  volumes:
    - name: appshell-token
      projected:
        sources:
          - serviceAccountToken:
              audience: https://registry.appshell.org/deploy
              expirationSeconds: 3600 # at most an hour is accepted
              path: token
```

```bash
APPSHELL_TOKEN=$(cat /var/run/appshell/token) \
  appshell app apply -f appshell.app.yaml --registry https://registry.appshell.org
```

A workload may only apply, only an application that already exists, and only one named as
`scope/name` in the resource, since it has no scope of its own. A refusal says what to
check: `appshell trust list <scope> --application <name>` against the job or account, or
the audience setting. Against a registry without trusted deployment enabled
(`AUTH_MODE=none`, every local one), apply retries once without a token.

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

| Option           | Default                  | Purpose             |
| ---------------- | ------------------------ | ------------------- |
| `-t, --template` | `appshell.template.json` | Template to process |
| `-o, --outDir`   | `dist`                   | Output location     |
| `-f, --outFile`  | `appshell.manifest.json` | Output filename     |

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

> **Note** the `vars` section defines runtime configuration values a package reads with `getVars()` from [`@appshell/runtime/vars`](../runtime/README.md) once it is loaded. The package must share `@appshell/runtime` as a singleton to receive them. See the examples for a use case.

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
