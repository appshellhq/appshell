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

It used to also carry `APPSHELL_ENV`, the host's build-time `process.env` capture. That
went when the registry became the runtime entry point: the registry renders the page and
inlines the composition, so nothing loaded the generated script any more, and everything
it carried — root remote, root props, colours — moved onto the Application record.

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

