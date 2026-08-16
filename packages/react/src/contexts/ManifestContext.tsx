import { AppshellManifest } from '@appshell/config';
import type { FC, ReactNode } from 'react';
import React, { createContext, useMemo } from 'react';

interface ManifestProviderProps {
  manifest: AppshellManifest;
  children: ReactNode;
}

export const ManifestContext = createContext<AppshellManifest>({
  remotes: {},
  modules: {},
  environment: {},
});

// `modules` is build-time webpack config that the browser has no use for, and it is
// the bulkiest field to inline. Warn for one release to find any consumer still on it.
const deprecateModules = (manifest: AppshellManifest): AppshellManifest =>
  new Proxy(manifest, {
    get(target, property, receiver) {
      if (property === 'modules') {
        // eslint-disable-next-line no-console
        console.warn(
          'useManifest().modules is deprecated and will be removed. It is build-time webpack config; use useRemote() for what the browser needs. Please open an issue at github.com/appshell-org/appshell if you rely on it.',
        );
      }

      return Reflect.get(target, property, receiver);
    },
  });

export const ManifestProvider: FC<ManifestProviderProps> = ({ manifest, children }) => {
  const value = useMemo(() => deprecateModules(manifest), [manifest]);

  return <ManifestContext.Provider value={value}>{children}</ManifestContext.Provider>;
};

export const ManifestConsumer = ManifestContext.Consumer;

export default ManifestContext;
