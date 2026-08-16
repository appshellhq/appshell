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

## Getting started

Point an environment at a host bundle and the registry does the rest:

```bash
appshell env create my-env --host-bundle-url https://cdn.example.com/appshell/1.2.3/main.js
```

Omit `--host-bundle-url` to use the bundle the registry ships with.

The package publishes `dist/` and nothing else. A registry image installs it and serves `dist` under
a versioned path, so pinning a bundle version is an ordinary dependency bump:

```dockerfile
RUN npm install @appshell/react-host@1.2.3
RUN cp -R node_modules/@appshell/react-host/dist public/host
```

To iterate on this package itself, start the bundle server and point an environment at it. The
registry still renders the shell, so you develop against the same path a deployment takes:

```bash
npm start
appshell env create my-dev --ephemeral --host-bundle-url http://localhost:3030/main.js
```

## Environment configuration

Add the following properties to your .env

```sh
# Public url. Defaults to localhost
APPSHELL_PUBLIC_URL=
# Port on which the appshell host will run
APPSHELL_PORT=3030
# Location the appshell host processes to generate the global registry index
APPSHELL_REGISTRY=/appshell/appshell_registry
# Remote module to load from the global registry index
APPSHELL_ROOT=ContainerModule/App
# Props to be passed to the Appshell component specified by APPSHELL_ROOT, as a serialized JSON string.
APPSHELL_ROOT_PROPS='{"foo":"bar"}'
# Collection of registries that will be incorporated into the current registry output
APPSHELL_BASE_REGISTRY=http://prod.url.com/registry ./path/to/appshell_registry
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
# Title of the application
APPSHELL_TITLE=My App
# Description of the application
APPSHELL_DESCRIPTION=Appshell React host
# Custom URL for global stylesheet
APPSHELL_STYLESHEET_URL=https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap
# Used during development to access base registry that has api key authentication enabled
APPSHELL_API_KEY=XXX-API-KEY-FOR-BASE-REGISTRY
# Header used to send the api key
APPSHELL_API_KEY_HEADER=x-api-key
# Used during development to access base registry that may be behind authenticated endpoint
APPSHELL_PROXY_URL=http://proxy-url.com/proxy

APPSHELL_CONTAINER_SCALE=1
ENV_TARGET=

```
