/* eslint-disable react/jsx-props-no-spreading */
import { APPSHELL_ENV } from '@appshell/core';
import { RemoteSlot } from '@appshell/react';
import React from 'react';
import ReactDOM from 'react-dom/client';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
const props = JSON.parse(APPSHELL_ENV.APPSHELL_ROOT_PROPS);

root.render(
  <React.StrictMode>
    <RemoteSlot remote={APPSHELL_ENV.APPSHELL_ROOT} fallback="Loading..." {...props} />
  </React.StrictMode>,
);
