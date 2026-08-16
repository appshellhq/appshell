<div align="center">
  <a href="https://github.com/navaris/appshell">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://github.com/navaris/appshell/blob/main/assets/branding/appshell-logo-white_2x.png">
      <img alt="appshell" src="https://github.com/navaris/appshell/blob/main/assets/branding/appshell-logo_2x.png">
    </picture>
  </a>
</div>

[![Appshell CI](https://github.com/navaris/appshell/actions/workflows/pipeline.yml/badge.svg)](https://github.com/navaris/appshell/actions/workflows/pipeline.yml)

# @appshell/react-host

Appshell React host for building micro-frontends with Appshell and Webpack Module federation.

Working examples can be found [here](https://github.com/navaris/appshell/tree/main/examples).

`@appshell/react-host` is the browser bundle that mounts your micro-frontends. It is not a server —
the Appshell registry renders the shell document, inlines the resolved composition, and serves this
bundle at the URL an environment's `hostBundleUrl` points at.

**Building a micro-frontend? You do not need this package.** Run your own dev server and publish to
an environment; the registry loads the host bundle for you. This README is for pinning which bundle
an environment uses, and for working on the bundle itself.

## Choosing a bundle

Every environment resolves a host bundle. By default that is the one the registry image ships, so
there is nothing to configure. Point `hostBundleUrl` elsewhere to pin a version or serve from a CDN:

```bash
appshell env create my-env --host-bundle-url https://cdn.example.com/appshell/1.2.3/main.js
```

The package publishes `dist/` and nothing else, so a registry image can serve it under a versioned
path and pinning becomes an ordinary dependency bump:

```dockerfile
RUN npm install @appshell/react-host@1.2.3
RUN cp -R node_modules/@appshell/react-host/dist public/host
```

## Working on the bundle

`npm start` serves `main.js` and nothing else — the registry still renders the shell, so you develop
against the same path a deployment takes. The registry does not need to be local: `hostBundleUrl` is
resolved by the browser, so a shared registry can point at your machine.

```bash
npm start
appshell env create host-dev --ephemeral --host-bundle-url http://localhost:3030/main.js
```

> **Note**
> Chrome and Firefox treat `localhost` as a trustworthy origin, so an `https` registry may load an
> `http` bundle from it. Safari is stricter — run the registry locally, or serve `main.js` over TLS.

## Environment configuration

A registry-served shell needs none of this — the environment supplies the root remote, its props,
and the page's title, colours and stylesheet, and the registry inlines them. These are the
standalone fallbacks, read from the `appshell.env.js` that `appshell generate env` writes:

```sh
# Public url. Defaults to localhost
APPSHELL_PUBLIC_URL=
# Port the bundle's development server listens on
APPSHELL_PORT=3030
# Remote module to mount at the root, when no composition is inlined
APPSHELL_ROOT=ContainerModule/App
# Props for that remote, as a serialized JSON string
APPSHELL_ROOT_PROPS='{"foo":"bar"}'
# File to setup the environment. Defaults to .env
APPSHELL_ENV=.env
# Prefix used to specify which env vars to include when generating appshell.env.js. Leaving this empty will include ALL variables in the .env
APPSHELL_ENV_PREFIX=APPSHELL_
# Name of global variable used in the generated appshell.env.js. Defaults to window.__appshell_env__
APPSHELL_ENV_GLOBAL_VAR=__appshell_env__
# Background color of splash screen
APPSHELL_THEME_COLOR=
# Color of splash screen loading
APPSHELL_PRIMARY_COLOR=
```
