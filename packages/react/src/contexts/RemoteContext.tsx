import { AppshellRemote } from '@appshell/config';
import type { FC, ReactNode } from 'react';
import React, { createContext } from 'react';

interface RemoteProviderProps {
  remote?: AppshellRemote;
  children: ReactNode;
}

export const RemoteContext = createContext<AppshellRemote | undefined>(undefined);

export const RemoteProvider: FC<RemoteProviderProps> = ({ remote, children }) => (
  <RemoteContext.Provider value={remote}>{children}</RemoteContext.Provider>
);

RemoteProvider.defaultProps = {
  remote: undefined,
};

export const RemoteConsumer = RemoteContext.Consumer;

export default RemoteContext;
