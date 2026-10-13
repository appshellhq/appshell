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

The manifest is then **published to the appshell registry** as a named, versioned package and **activated** into an application. The registry composes every activated package into a single `global appshell configuration` and serves it — along with the shell document itself — to the browser.

```
webpack build  ->  appshell.template.json
                        |
                   appshell publish
                        |
                        v
                 appshell registry  --(composition)-->  shell
```

A published version is immutable. Changing what an application runs means activating a different version, which produces a new application revision that can be inspected and rolled back.

## CSP and the dev server `devtool`

The registry-served shell sends a strict `Content-Security-Policy` with no `unsafe-eval`. Webpack's
development-mode default `devtool` (`eval`) wraps every module in `eval()`, which that policy blocks —
the remote entry loads (200) but its container never assigns itself on `window`. Each app's
`webpack.config.js` sets `devtool: isDevelopment ? 'source-map' : false` to avoid this; apply the same
override to any new MFE added to this example.

## Metadata

You can associate any kind of metadata with each remote module (via `appshell.config.yaml`) and use the metadata to configure your appshell by supplying routing information, rendering details, etc.

## Mounting remotes

Use `RemoteSlot` from `@appshell/react` to mount a remote. The slot looks the remote key
up in the composition the registry inlined, then loads it over Module Federation.

```typescript
<Grid>
  <RemoteSlot remote="PingModule/App" />
  <RemoteSlot remote="PongModule/App" />
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
  appshell/registry:latest
```

`AUTH_MODE=none` disables authentication and is for local development only.

### 2. Set your CLI context

The registry, application, and token are your working context — set them once with the CLI, like a
kubectl context, rather than per project:

```bash
appshell config set registry http://localhost:7150
appshell config set application appshell/appshell-example
```

Under `AUTH_MODE=none` there is no token to set. Against a registry that enforces auth, run
`appshell login` once; it stores a per-registry token in `~/.appshell/credentials`.

`@appshell/webpack-plugin` reads this same context, so the example packages need no registry or token in
their `.env`. To point a single build somewhere else, set `APPSHELL_REGISTRY` / `APPSHELL_APPLICATION`
(or pass `registry` / `application` to the plugin) — it will warn that it is overriding your context.
In CI, where there is no `~/.appshell`, those env vars (and `APPSHELL_TOKEN`) are the whole story.

The packages still read `.env` for their dev-server ports, so create one:

```bash
cp sample.env .env
```

### 3. Declare the application

```bash
set -a; . ./.env; set +a   # appshell.app.yaml expands ${SUPPORT_URL} from your environment
appshell scopes create appshell
appshell app apply -f appshell.app.yaml
```

The file names its scope, so it lands in `appshell` whoever applies it, and declaring an application
never creates a scope as a side effect. On a fresh registry, claim it first, as above.

This walkthrough needs a registry where you can claim `appshell`, like the local one started above:
the example packages are named `@appshell/…`, so they publish into that scope too. On a shared
registry where someone else owns `appshell`, don't rename things; start from the hosted example
instead, by cloning it into your own scope.

The apply creates `appshell/appshell-example` and sets its shell config — the root remote above all,
without which the shell has nothing to mount. Re-running it is safe.

### 4. Run it — the dev server opens an overlay

On a fresh registry the application has nothing activated yet, and an overlay redirects a package
the application already runs. So seed it once: build each example, publish it, and activate the
published version. This is the same sequence the repository's end-to-end check runs on every pull
request.

```bash
npm run bootstrap
npm run build
for app in apps/*/; do
  (cd "$app" && npx appshell publish --template dist/appshell.template.json)
  appshell app activate "$(node -p "const p = require('./${app}package.json'); p.name.slice(1) + '@' + p.version")"
done
```

Then start the dev servers:

```bash
npm run start
```

Each app runs its webpack dev server, and `@appshell/webpack-plugin` opens an **overlay** on your
application instead of publishing: the application runs your local code for that package, **in
your browser only**. Each dev server prints a confirm URL. Open it once, and that browser holds the
overlay. Nothing is published, and the published versions are left alone, so two developers sharing
a registry never overwrite each other. Editing `appshell.config.yaml` (routes, metadata) shows up on
the next build. A package the application doesn't run yet can't be redirected, and the dev server
says so; the seed step above is what avoids that.

An overlay needs the application to allow it, and you to be able to write to its scope.
`appshell.app.yaml` sets `allowOverlays: true`, which is right for a development application. In
production it's a deliberate choice: appshell's own hosted example allows it, for demos, and only
members of its scope can open one. `appshell dev` opens the same kind of overlay for a package
already running somewhere, without the plugin.

Open the shell:

```bash
appshell app open  # the application in your CLI context: http://localhost:7150/a/appshell/appshell-example
```

The registry serves the shell document itself, so there is no separate host to run.

### Publishing and activating

Publishing is a release action, and a dev server isn't a release, so builds never publish on their
own. A release publishes explicitly, at a new version, which is immutable once published:

```bash
appshell publish --template dist/appshell.template.json
```

Publishing is inert: nothing runs it until an application activates it. appshell's own examples are
published this way from CI, through trusted publishing (the workflow's own identity, no stored token).
Their production application pins the versions it runs in a deployment repository, so activating one
is a reviewed change.

## Inspecting an application

```bash
appshell app list                          # every application in the scope
appshell app get appshell-example          # packages, revision, visibility
appshell app composition appshell-example  # the resolved config the shell receives
appshell app revisions appshell-example    # revision history
appshell app rollback appshell-example --to 3  # roll back to a previous revision
```

## Promoting between applications

```bash
appshell app clone --from dev --to staging
appshell app sync --from dev --to staging --include packages
```
