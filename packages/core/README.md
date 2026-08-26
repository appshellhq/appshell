<div align="center">
  <a href="https://github.com/navaris/appshell">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://github.com/navaris/appshell/blob/main/assets/branding/appshell-logo-white_2x.png">
      <img alt="appshell" src="https://github.com/navaris/appshell/blob/main/assets/branding/appshell-logo_2x.png">
    </picture>
  </a>
</div>

[![Appshell CI](https://github.com/navaris/appshell/actions/workflows/pipeline.yml/badge.svg)](https://github.com/navaris/appshell/actions/workflows/pipeline.yml)

# @appshell/core

Core types for building micro-frontends with Appshell and Webpack Module federation.

Working examples can be found [here](https://github.com/navaris/appshell/tree/main/examples).

## Getting Started

To begin, you'll need to install `@appshell/core`:

```console
npm install @appshell/core
```

or

```console
yarn add @appshell/core
```

or

```console
pnpm add @appshell/core
```

## What it exports

`@appshell/core` is the small shared surface between a micro-frontend and the shell.

### `APPSHELL_ENV`

The host's build-time configuration, read from the `appshell.env.js` that
`appshell generate env` writes. Absent when the registry served the page — it inlines
the composition instead — so every field falls back to a default.

```ts
import { APPSHELL_ENV } from '@appshell/core';

APPSHELL_ENV.APPSHELL_PUBLIC_URL;
APPSHELL_ENV.APPSHELL_ROOT;
APPSHELL_ENV.APPSHELL_ROOT_PROPS;
APPSHELL_ENV.APPSHELL_THEME_COLOR;
APPSHELL_ENV.APPSHELL_PRIMARY_COLOR;
```

This is distinct from a package's **vars**, which the registry delivers through the
composition as `window.__appshell_vars__<scope>`.

### Types

`AppshellRemote`, `AppshellManifest`, `AppshellIndex` and `Metadata`, re-exported from
`@appshell/config` so a micro-frontend can type its own metadata without depending on
the build tooling.

```ts
import type { AppshellRemote } from '@appshell/core';

const Remote = ({ remote }: { remote: AppshellRemote }) => <pre>{remote.module}</pre>;
```

## License

[MIT](./LICENSE)

