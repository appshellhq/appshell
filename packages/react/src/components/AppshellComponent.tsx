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

// A remote served from localhost / a private LAN address is a webpack dev-server, so it
// exposes a live-reload websocket we can watch. Detected at runtime (not via NODE_ENV) so
// this survives the library being built in production mode yet consumed by a dev app.
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

const watchRemoteHmrHash = (
  remoteEntryUrl: string,
  onHashChange: (hash: string) => void,
): (() => void) => {
  const wsUrl = toWebpackDevServerWsUrl(remoteEntryUrl);
  if (!wsUrl) {
    // eslint-disable-next-line no-console
    console.log(`[appshell-hmr] not a dev-server host, skipping watch: ${remoteEntryUrl}`);
    return () => undefined;
  }

  // eslint-disable-next-line no-console
  console.log(`[appshell-hmr] watching dev-server ws: ${wsUrl}`);

  let lastHash: string | null = null;
  let closed = false;
  const socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    // eslint-disable-next-line no-console
    console.log(`[appshell-hmr] ws open: ${wsUrl}`);
  };

  socket.onerror = () => {
    // eslint-disable-next-line no-console
    console.log(`[appshell-hmr] ws error: ${wsUrl}`);
  };

  socket.onmessage = (event) => {
    if (closed) return;

    try {
      const payload = JSON.parse(`${event.data}`) as { type?: string; data?: string };

      // Track hash so we can pass it to the loader cache-buster.
      if (payload.type === 'hash' && typeof payload.data === 'string') {
        lastHash = payload.data;
        return;
      }

      // "ok" fires after webpack has finished serving the new bundle — safe to re-load.
      // "static-changed" fires when a static file changes and the server restarts.
      if (payload.type === 'ok' || payload.type === 'static-changed') {
        // eslint-disable-next-line no-console
        console.log(`[appshell-hmr] ws "${payload.type}" (hash=${lastHash})`);
        if (lastHash) {
          onHashChange(lastHash);
        }
      }
    } catch {
      // Ignore non-JSON frames or unrelated payloads.
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
    let watching = false;
    let isLoading = false;
    let pendingReloadCacheBust: string | undefined;
    let stopWatching: () => void = () => undefined;
    const loadComponent = remoteLoader(config);

    async function load(cacheBust?: string) {
      if (isLoading) {
        if (cacheBust) {
          pendingReloadCacheBust = cacheBust;
        }
        return;
      }

      isLoading = true;

      try {
        active = true;
        setElement(undefined);
        const [Component, manifest] = await loadComponent<ComponentType>(remote, {
          forceReload: Boolean(cacheBust),
          cacheBust,
        });
        if (!Component) {
          isLoading = false;
          return;
        }

        if (!watching && manifest.remotes[remote]?.remoteEntryUrl) {
          watching = true;
          // eslint-disable-next-line no-console
          console.log(`[appshell-hmr] attaching watcher for ${remote}`);
          stopWatching = watchRemoteHmrHash(manifest.remotes[remote].remoteEntryUrl, (hash) => {
            if (disposed) return;
            // eslint-disable-next-line no-console
            console.log(`[appshell-hmr] ${remote} hash changed: ${hash}`);
            load(hash);
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
        if (pendingReloadCacheBust && !disposed) {
          const nextCacheBust = pendingReloadCacheBust;
          pendingReloadCacheBust = undefined;
          load(nextCacheBust);
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
