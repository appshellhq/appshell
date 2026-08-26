import { AppshellRemote } from '@appshell/config';
import React from 'react';
// eslint-disable-next-line import/no-named-as-default
import RemoteContext from '../contexts/RemoteContext';

/** The remote backing the nearest `RemoteSlot` — it already knows its own key. */
export default (): AppshellRemote | undefined => React.useContext(RemoteContext);
