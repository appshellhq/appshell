<div align="center">
  <a href="https://github.com/navaris/appshell">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://github.com/navaris/appshell/blob/main/assets/branding/appshell-logo-white_2x.png">
      <img alt="appshell" src="https://github.com/navaris/appshell/blob/main/assets/branding/appshell-logo_2x.png">
    </picture>
  </a>
</div>

[![Appshell CI](https://github.com/navaris/appshell/actions/workflows/pipeline.yml/badge.svg)](https://github.com/navaris/appshell/actions/workflows/pipeline.yml)

Appshell is a collection of utilities for building micro-frontend applications using Webpack Module Federation

# Vocabulary

Appshell has four nouns. Everything else is a property of one of them.

| Term            | Identity                | What it is                                                                       |
| --------------- | ----------------------- | -------------------------------------------------------------------------------- |
| **Scope**       | `acme`                  | Namespace and permission boundary. A principal may only write inside its own.    |
| **Package**     | `acme/checkout@1.5.0`   | What you publish. Immutable, digest-addressed. Contains a manifest.              |
| **Application** | `acme/storefront`       | The composition — shell config, activated packages, overrides, revision history. |
| **Remote**      | `PingModule/Ping`       | What the browser loads, over Module Federation.                                  |

```
Scope  acme
 ├── Package        acme/checkout@1.5.0     immutable · contains a manifest
 └── Application    acme/storefront
       ├── shell            root, title, colours, shellBundleUrl
       ├── packages         { checkout -> activated 1.5.0, ... }
       ├── overrides.vars   { scope -> { KEY: value } }
       ├── revisions        append-only, rollback target
       ├── composition      denormalised, served to the browser
       └── overlays         per-developer, ephemeral
```

## From your editor to the page

```
appshell.config.yaml          remotes and vars, as authored
    |  webpack plugin
appshell.template.json
    |  appshell generate manifest
manifest
    |  appshell publish
Package  acme/checkout@1.5.0  immutable from here on
    |  activate
Application  acme/storefront  -> new revision
    |  compose
composition                   remotes + vars, overrides already merged
    |  registry serves
shell HTML + window.__appshell_config__
    |  loader resolves
Remote  ->  Module Federation  ->  mounted in a RemoteSlot
```

## The relationships that carry weight

**Activation, not containment.** A package exists on its own and can be activated into
many applications. `visibility` gates that activation across scopes — it is not a read
control, since `remoteEntry.js` is fetched by anonymous script tags regardless.

**Activation is keyed by line, not version.** `acme/checkout` is one slot; activating
`1.5.0` over `1.4.0` upgrades in place. Two versions of one package cannot coexist —
they would collide on remote keys.

**One package, many remotes.** A manifest may declare several (`PongModule/Pong`,
`PongModule/CoolComponent`). This is why `appshell dev` asks the registry which remotes
belong to the current directory rather than guessing.

**Three layers merge into `composition.vars`**, in order: what the package declared, the
application's `overrides.vars`, then any per-request overlay. The browser applies nothing.

**Overlays are the only non-durable layer.** Overrides are shared and land in every
revision; an overlay is resolved per request, expires on its own, and can only redirect
remote keys the composition already has — never introduce one.

## Two words to watch

**Scope** is overloaded. `scopeId` is the ownership namespace; a **share scope** is the
Module Federation dependency-sharing namespace that `sharedBaselines` is keyed by. Same
word, unrelated concepts — inherited from Module Federation.

**Remote** is the only term borrowed from Module Federation, and it is deliberately
confined to the layer where Module Federation actually operates. `Package` and
`Application` are framework-neutral, so swapping the loader would disturb only the
bottom tier.

# @appshell packages

- [@appshell/cli](./packages/cli/)
- [@appshell/config](./packages/config/)
- [@appshell/core](./packages/core/)
- [@appshell/loader](./packages/loader/)
- [@appshell/react](./packages/react/)
- [@appshell/webpack-plugin](./packages/webpack-plugin/)
- [@appshell/react-refresh-singleton-plugin](./packages/react-refresh-singleton-plugin/)

# @appshell hosts

- [@appshell/react-shell](./packages/react-shell/)
