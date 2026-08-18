<div align="center">
  <a href="https://github.com/appshell-org/appshell">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://github.com/appshell-org/appshell/blob/main/assets/branding/appshell-logo-white_2x.png">
      <img alt="appshell" src="https://github.com/appshell-org/appshell/blob/main/assets/branding/appshell-logo_2x.png">
    </picture>
  </a>
</div>

# Example Overview

Consists of 3 micro-frontends, each is configured with `@appshell/webpack-plugin`.

![Screenshot](https://github.com/appshell-org/appshell/blob/main/assets/docs/appshell_react_host_screenshot.png 'Screenshot')

## Build time

At build time, each `AppshellPlugin` emits an appshell manifest template to the build directory.

## Runtime

At runtime the config template `dist/appshell.template.json` is processed to generate an `appshell manifest`, which is the final runtime configuration for a given micro-frontend.

The manifest is then **published to the appshell registry** as a named, versioned app package and **activated** into an environment. The registry composes every activated app into a single `global appshell configuration` and serves it — along with the shell document itself — to the browser.

```
webpack build  ->  appshell.template.json
                        |
                   appshell publish
                        |
                        v
                 appshell registry  --(composition)-->  shell
```

A published version is immutable. Changing what an environment runs means activating a different version, which produces a new environment revision that can be inspected and rolled back.

## Metadata

You can associate any kind of metadata with each remote module (via `appshell.config.yaml`) and use the metadata to configure your appshell by supplying routing information, rendering details, etc.

## Consuming Appshell components

Use `AppshellComponent` from `@appshell/react` to dynamically load remote frontends. It uses the remote key to lookup the runtime info for that particular Appshell component.

```typescript
<Grid>
  <AppshellComponent remote="PingModule/App" />
  <AppshellComponent remote="PongModule/App" />
</Grid>
```

## Running the example

### 1. Start a registry

The registry needs MongoDB and nothing else.

```bash
docker run -d -p 27017:27017 --name appshell-mongo mongo:7

docker run -d -p 7150:7150 --name appshell-registry \
  -e MONGO_URI=mongodb://host.docker.internal:27017/appshell-registry \
  -e AUTH_MODE=none \
  ghcr.io/appshell-org/registry:latest
```

`AUTH_MODE=none` disables authentication and is for local development only.

### 2. Point the CLI at it

```bash
cp sample.env .env # create a .env
```

```ini
APPSHELL_REGISTRY=http://localhost:7150
APPSHELL_ENVIRONMENT=dev
APPSHELL_SCOPE_ID=default
# The CLI always sends a token; AUTH_MODE=none makes the value irrelevant.
APPSHELL_TOKEN=local-dev
```

These can be persisted instead of passed per-invocation:

```bash
appshell config set registry http://localhost:7150
appshell config set environment dev
```

Against a registry that does enforce auth, use `appshell login` rather than `APPSHELL_TOKEN`.

### 3. Create the environment

```bash
appshell env create dev
```

### 4. Build and publish

```bash
npm run bootstrap
npm run build
```

Then, from each app directory:

```bash
appshell publish --template dist/appshell.template.json --environment dev
```

Publishing on its own only uploads the version; `--environment` also activates it. Add `--watch` to republish whenever the template changes.

### 5. Run it

```bash
npm run start          # start the micro-frontends
appshell env open dev  # print the shell url
```

The registry serves the shell document itself, so there is no separate host to run — open the url that `env open` prints (`http://localhost:7150/e/default/dev`).

To serve the host yourself instead, point it at the composition endpoint:

```
http://localhost:7150/dev/appshell.config.json
```

## Inspecting an environment

```bash
appshell env list                  # every environment in the scope
appshell env get dev               # apps, revision, visibility
appshell env composition dev       # the resolved config the shell receives
appshell env revisions dev         # revision history
appshell env rollback dev --to 3   # roll back to a previous revision
```

## Promoting between environments

```bash
appshell env clone --from dev --to staging
appshell env sync --from dev --to staging --include apps
```

## Legacy file registry

Earlier versions of this example wrote `appshell.config.json` and `appshell.snapshot.json` into the local `appshell_registry/` directory via `appshell register --registry $SAMPLE_MFE_REGISTRY`. That still works and is what the `register` npm scripts do, but it is deprecated in favour of `appshell publish`.

`appshell register` also accepts a registry URL, which posts the manifest to `<registry>/<environment>` and lets a host read `<registry>/<environment>/appshell.config.json`. That is the smallest possible migration step, but it skips versioning, activation, and revisions.
