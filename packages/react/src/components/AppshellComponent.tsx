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

/**
 * Loads a remote once and leaves it alone.
 *
 * Keeping a remote current while it is being developed is not this component's job.
 * A remote served by a dev server ships webpack's HMR runtime and a dev-server client
 * inside its own `remoteEntry`, so it applies its own edits in place and React Fast
 * Refresh swaps the component implementations underneath this tree — no reload, and no
 * remount that would discard state this component never owned.
 *
 * Watching the remote's socket from here and reloading the page was strictly worse: it
 * raced the remote's own update, and it threw away the entire composed app to deliver a
 * change to one subtree. When webpack genuinely cannot apply an update, the remote's own
 * client still falls back to a full reload — which is the right place for that decision,
 * because it is the only side that knows whether the update applied.
 */
const AppshellComponent = <TProps extends ExtendedProps>({
  remote,
  fallback,
  ...rest
}: AppshellComponentProps<TProps>): ReactElement<TProps> => {
  const config = useGlobalConfig();
  const [element, setElement] = useState<ReactElement>();

  useEffect(() => {
    let disposed = false;
    const loadComponent = remoteLoader(config);

    async function load() {
      try {
        const [Component, manifest] = await loadComponent<ComponentType>(remote);

        if (disposed || !Component) {
          return;
        }

        setElement(
          <ManifestProvider manifest={manifest}>
            <RemoteProvider remote={manifest.remotes[remote]}>
              <Component {...rest} />
            </RemoteProvider>
          </ManifestProvider>,
        );
      } catch (err) {
        if (!disposed) {
          setElement(<LoadingError remote={remote} reason={`${err}`} />);
        }
      }
    }

    setElement(undefined);
    load();

    return () => {
      disposed = true;
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
