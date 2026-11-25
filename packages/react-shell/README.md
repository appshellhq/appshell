<div align="center">
  <a href="https://github.com/appshell-org/appshell">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://github.com/appshell-org/appshell/blob/main/assets/branding/appshell-logo-white_2x.png">
      <img alt="appshell" src="https://github.com/appshell-org/appshell/blob/main/assets/branding/appshell-logo_2x.png">
    </picture>
  </a>
</div>

[![Appshell CI](https://github.com/appshell-org/appshell/actions/workflows/pipeline.yml/badge.svg)](https://github.com/appshell-org/appshell/actions/workflows/pipeline.yml)

# @appshell/react-shell

Appshell React shell for building micro-frontends with Appshell and Webpack Module federation.

Working examples can be found [here](https://github.com/appshell-org/appshell/tree/main/examples).

`@appshell/react-shell` is the browser bundle that mounts your micro-frontends. It is not a server —
the Appshell registry renders the shell document, inlines the resolved composition, and serves this
bundle at the URL an application's `shellBundleUrl` points at.

**Building a micro-frontend? You do not need this package.** Run your own dev server and publish to
an application; the registry loads the shell bundle for you. This README is for pinning which bundle
an application uses, and for working on the bundle itself.

## Choosing a bundle

Every application resolves a shell bundle. By default that is the one the registry image ships, so
there is nothing to configure. Point `shellBundleUrl` elsewhere to pin a version or serve from a CDN:

```bash
appshell app create my-env --shell-bundle-url https://cdn.example.com/appshell/1.2.3/main.js
```

The package publishes `dist/` and nothing else, so a registry image can serve it under a versioned
path and pinning becomes an ordinary dependency bump:

```dockerfile
RUN npm install @appshell/react-shell@1.2.3
RUN cp -R node_modules/@appshell/react-shell/dist public/shell
```

## Working on the bundle

`npm start` serves `main.js` and nothing else — the registry still renders the shell, so you develop
against the same path a deployment takes. The registry does not need to be local: `shellBundleUrl` is
resolved by the browser, so a shared registry can point at your machine.

```bash
npm start
appshell app create shell-dev --ephemeral --shell-bundle-url http://localhost:3030/main.js
```

> **Note**
> Chrome and Firefox treat `localhost` as a trustworthy origin, so an `https` registry may load an
> `http` bundle from it. Safari is stricter — run the registry locally, or serve `main.js` over TLS.

## Application configuration

The registry supplies the root remote, its props, and the page's title, colours,
favicon and stylesheet, inlining them into the document it serves. None of it comes
from this package's environment any more.

What remains here is dev-server and CLI configuration:

```sh
# Port the bundle's development server listens on
APPSHELL_PORT=3030
# Registry to publish and activate against
APPSHELL_REGISTRY=
# Credential for that registry
APPSHELL_API_KEY=
```

## What fills the page before the root remote mounts

Nothing, currently. The shell renders no fallback: what covers the gap while the root
remote is fetched is the application's business, and it cannot come from the root
package itself — that package is the thing being waited for. It has to come from the
document the registry renders.

The shell used to ship a `Splash` component for this, configured through two env vars
that stopped reaching the browser when the registry took over page rendering, so it had
been rendering its hardcoded fallback colours for some time. It was removed rather than
rewired: a document-level splash paints on the document's first paint rather than after
the shell bundle downloads, parses and mounts React, and it can be styled by the
application instead of by this package.

Inner remotes are unaffected — `RemoteSlot` takes a `fallback` prop, and that has always
been the consumer's to supply.
