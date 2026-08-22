/* eslint-disable react/jsx-props-no-spreading */
import { AppshellIndex } from '@appshell/config';
import remoteLoader from '@appshell/loader';
import React, { ComponentType, ReactElement, ReactNode, useEffect, useState } from 'react';
import { ManifestProvider } from '../contexts/ManifestContext';
import { RemoteProvider } from '../contexts/RemoteContext';
import useGlobalConfig from '../hooks/useGlobalConfig';
import LoadingError from './LoadingError';

export type ExtendedProps = Record<string, unknown>;

declare global {
  interface Window {
    __appshell_index__: AppshellIndex;
  }
}
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-constraint
export type AppshellComponentProps<TProps extends ExtendedProps = ExtendedProps> = {
  remote: string;
  fallback?: ReactNode;
} & TProps;

const isDevServerHost = (host: string): boolean => {
  const hostname = host.split(':')[0];
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.local') ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  );
};

const toWebpackDevServerWsUrl = (remoteEntryUrl: string): string | null => {
  try {
    const url = new URL(remoteEntryUrl);
    if (!isDevServerHost(url.host)) return null;
    const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${url.host}/ws`;
  } catch {
    return null;
  }
};

const watchRemoteHmr = (remoteEntryUrl: string, onUpdated: () => void): (() => void) => {
  const wsUrl = toWebpackDevServerWsUrl(remoteEntryUrl);
  if (!wsUrl) return () => undefined;

  let closed = false;
  let pendingHash: string | null = null;
  let lastAppliedHash: string | null = null;
  const socket = new WebSocket(wsUrl);

  socket.onmessage = (event) => {
    if (closed) return;

    try {
      const payload = JSON.parse(`${event.data}`) as { type?: string; data?: string };

      if (payload.type === 'hash' && typeof payload.data === 'string') {
        pendingHash = payload.data;
        return;
      }

      // "ok" indicates the remote dev-server finished rebuilding.
      if (payload.type === 'ok' && pendingHash) {
        if (!lastAppliedHash) {
          // Prime baseline on first connect; don't reload immediately.
          lastAppliedHash = pendingHash;
          pendingHash = null;
          return;
        }

        if (pendingHash !== lastAppliedHash) {
          lastAppliedHash = pendingHash;
          pendingHash = null;
          onUpdated();
          return;
        }

        pendingHash = null;
      }
    } catch {
      // Ignore non-JSON frames.
    }
  };

  return () => {
    closed = true;
    socket.close();
  };
};

const AppshellComponent = <TProps extends ExtendedProps>({
  remote,
  fallback,
  ...rest
}: AppshellComponentProps<TProps>): ReactElement<TProps> => {
  const config = useGlobalConfig();
  const [element, setElement] = useState<ReactElement>();

  useEffect(() => {
    let active = false;
    let disposed = false;
    let isLoading = false;
    let pendingReload = false;
    let watching = false;
    let reloading = false;
    let stopWatching: () => void = () => undefined;
    const loadComponent = remoteLoader(config);

    async function load() {
      if (isLoading) {
        pendingReload = true;
        return;
      }

      isLoading = true;

      try {
        active = true;
        setElement(undefined);
        const [Component, manifest] = await loadComponent<ComponentType>(remote);
        if (!Component) {
          return;
        }

        if (!watching && manifest.remotes[remote]?.remoteEntryUrl) {
          watching = true;
          stopWatching = watchRemoteHmr(manifest.remotes[remote].remoteEntryUrl, () => {
            if (disposed) return;
            if (reloading) return;
            reloading = true;
            window.location.reload();
          });
        }

        active = false;
        setElement(
          <ManifestProvider manifest={manifest}>
            <RemoteProvider remote={manifest.remotes[remote]}>
              <Component {...rest} />
            </RemoteProvider>
          </ManifestProvider>,
        );
      } catch (err) {
        setElement(<LoadingError remote={remote} reason={`${err}`} />);
      } finally {
        isLoading = false;
        if (pendingReload && !disposed) {
          pendingReload = false;
          load();
        }
      }
    }

    if (!active) {
      load();
    }

    return () => {
      disposed = true;
      active = false;
      stopWatching();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remote, config, ...Object.values(rest)]);

  // eslint-disable-next-line no-console
  console.debug(`rendering AppshellComponent[${remote}], loading=${!element}`);
  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{element || fallback}</>;
};

AppshellComponent.defaultProps = {
  fallback: undefined,
};

export default AppshellComponent;

/**
 * @deprecated This component is deprecated and will be removed in future versions.
 * Please use AppshellComponent instead.
 */
export const FederatedComponent = AppshellComponent;
