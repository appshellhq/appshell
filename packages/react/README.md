<div align="center">
  <a href="https://github.com/navaris/appshell">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://github.com/navaris/appshell/blob/main/assets/branding/appshell-logo-white_2x.png">
      <img alt="appshell" src="https://github.com/navaris/appshell/blob/main/assets/branding/appshell-logo_2x.png">
    </picture>
  </a>
</div>

[![Appshell CI](https://github.com/navaris/appshell/actions/workflows/pipeline.yml/badge.svg)](https://github.com/navaris/appshell/actions/workflows/pipeline.yml)

# @appshell/react

React utilites for building micro-frontends with Webpack Module federation and Appshell.

Working examples can be found [here](https://github.com/navaris/appshell/tree/main/examples).

## Getting Started

To begin, you'll need to install `@appshell/react`:

```console
npm install @appshell/react --save-dev
```

or

```console
yarn add -D @appshell/react
```

or

```console
pnpm add -D @appshell/react
```

## RemoteSlot

Where a remote is mounted. The slot resolves the remote key against the composition,
loads it over Module Federation, renders `fallback` while that is in flight, and
surfaces a load failure in place rather than taking the page down with it.

```tsx
import { RemoteSlot } from '@appshell/react';

<App>
  <RemoteSlot remote="PingModule/Ping" fallback={<Spinner />} />
  <RemoteSlot remote="PongModule/Pong" fallback={<Spinner />} />
</App>
```

Any other props are passed through to the mounted remote.

The registry inlines the composition into the document it serves, so the component
needs no configuration of its own.

## useRemote

For access to the remote backing the surrounding `RemoteSlot`. Prefer this
over looking your own entry up in the manifest — the component already knows its key.

```tsx
import { useRemote } from '@appshell/react';

const MyComponent = () => {
  const remote = useRemote();

  ...
}
```
