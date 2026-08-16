/* eslint-disable react/jsx-props-no-spreading */
import { AppshellGlobalConfig } from 'packages/config/src/types';
import React, { FC, ReactNode, useEffect } from 'react';
import { GlobalConfigProvider } from '../contexts/GlobalConfigContext';
import AppshellComponent from './AppshellComponent';

/** The registry inlines the composition, so a shell it served needs no config fetch. */
const inlinedConfig = (): AppshellGlobalConfig | undefined => {
  const composition = typeof window === 'undefined' ? undefined : window.__appshell_config__;
  return composition && { index: composition.index };
};

const ReactHost: FC<{
  configUrl?: string;
  remote: string;
  fallback?: ReactNode;
  [x: string]: unknown;
}> = ({ configUrl, remote, fallback, ...rest }) => {
  const [config, setGlobalConfig] = React.useState<AppshellGlobalConfig | undefined>(inlinedConfig);

  useEffect(() => {
    if (config) {
      return;
    }

    if (!configUrl) {
      setGlobalConfig({ index: {} });
      return;
    }

    const fetchGlobalConfig = async () => {
      const res = await fetch(configUrl);
      setGlobalConfig(res.ok ? await res.json() : { index: {} });
    };

    fetchGlobalConfig();
  }, [config, configUrl]);

  if (!config) {
    return null;
  }

  return (
    <GlobalConfigProvider config={config}>
      <AppshellComponent remote={remote} fallback={fallback} {...rest} />
    </GlobalConfigProvider>
  );
};

ReactHost.defaultProps = {
  configUrl: undefined,
  fallback: undefined,
};

export default ReactHost;
