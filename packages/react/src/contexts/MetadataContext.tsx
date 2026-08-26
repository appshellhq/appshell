import { Metadata } from '@appshell/config';
import React, { createContext, FC, ReactNode } from 'react';

interface MetadataProviderProps {
  metadata: Metadata;
  children: ReactNode;
}

export const MetadataContext = createContext<Metadata>({});

export const MetadataProvider: FC<MetadataProviderProps> = ({ metadata, children }) => (
  <MetadataContext.Provider value={metadata}>{children}</MetadataContext.Provider>
);

export const MetadataConsumer = MetadataContext.Consumer;

export default MetadataContext;
