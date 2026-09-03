/* eslint-disable react/jsx-props-no-spreading */
import remoteLoader from '@appshell/loader';
import { ComponentType, ReactElement, ReactNode, useEffect, useState } from 'react';
import { RemoteProvider } from '../contexts/RemoteContext';
import LoadingError from './LoadingError';

export type ExtendedProps = Record<string, unknown>;

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-constraint
export type RemoteSlotProps<TProps extends ExtendedProps = ExtendedProps> = {
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
const RemoteSlot = <TProps extends ExtendedProps>({
  remote,
  fallback,
  ...rest
}: RemoteSlotProps<TProps>): ReactElement<TProps> => {
  const [element, setElement] = useState<ReactElement>();

  useEffect(() => {
    let disposed = false;
    const loadComponent = remoteLoader();

    async function load() {
      try {
        const [Component, resolved] = await loadComponent<ComponentType>(remote);

        if (disposed || !Component) {
          return;
        }

        setElement(
          <RemoteProvider remote={resolved}>
            <Component {...rest} />
          </RemoteProvider>,
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
  }, [remote, ...Object.values(rest)]);

  // eslint-disable-next-line no-console
  console.debug(`rendering RemoteSlot[${remote}], loading=${!element}`);
  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{element || fallback}</>;
};

RemoteSlot.defaultProps = {
  fallback: undefined,
};

export default RemoteSlot;
